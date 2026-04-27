#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
FABRIC_VERSION="2.4"
CA_VERSION="1.5"

export PATH="${NETWORK_DIR}/bin:$PATH"
export FABRIC_CFG_PATH="${NETWORK_DIR}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
die()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

command -v cryptogen   >/dev/null 2>&1 || die "cryptogen not found — download Fabric binaries first"
command -v configtxgen >/dev/null 2>&1 || die "configtxgen not found — download Fabric binaries first"
command -v docker      >/dev/null 2>&1 || die "docker not found"

# ─── 1. Clean previous state ──────────────────────────────────────────────────
log "Cleaning previous network state..."
cd "$NETWORK_DIR"
docker-compose -f docker-compose.fabric.yml down -v --remove-orphans 2>/dev/null || true
rm -rf crypto-config channel-artifacts

# ─── 2. Generate crypto material ─────────────────────────────────────────────
log "Generating crypto material with cryptogen..."
cryptogen generate --config=./crypto-config.yaml --output=./crypto-config
log "Crypto material generated."

# ─── 3. Create channel artifacts ─────────────────────────────────────────────
log "Creating channel artifacts..."
mkdir -p channel-artifacts

configtxgen -profile LegalOrdererGenesis -channelID system-channel \
  -outputBlock ./channel-artifacts/genesis.block
log "Genesis block created."

configtxgen -profile LegalChannel -outputCreateChannelTx \
  ./channel-artifacts/legal-channel.tx -channelID legal-channel
log "Channel transaction created."

for org in FirmA FirmB Regulator; do
  configtxgen -profile LegalChannel \
    -outputAnchorPeersUpdate "./channel-artifacts/${org}MSPanchors.tx" \
    -channelID legal-channel -asOrg "${org}MSP"
  log "Anchor peer update for ${org} created."
done

# ─── 4. Start Docker services ─────────────────────────────────────────────────
log "Starting Fabric network containers..."
docker-compose -f docker-compose.fabric.yml up -d

log "Waiting for containers to be healthy (30s)..."
sleep 30

# ─── 5. Create and join channel ───────────────────────────────────────────────
log "Creating legal-channel..."

ORDERER_CA="${NETWORK_DIR}/crypto-config/ordererOrganizations/orderer.pangochain.com/orderers/orderer.pangochain.com/tls/ca.crt"
CRYPTO="${NETWORK_DIR}/crypto-config"

# FirmA creates the channel
docker exec fabric-cli peer channel create \
  -o orderer.pangochain.com:7050 \
  -c legal-channel \
  -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/legal-channel.tx \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/orderer.pangochain.com/orderers/orderer.pangochain.com/tls/ca.crt \
  --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/legal-channel.block

log "Channel created. Joining peers..."

# Join FirmA
docker exec fabric-cli peer channel join \
  -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/legal-channel.block

# Join FirmB
docker exec -e CORE_PEER_ADDRESS=peer0.firmb.pangochain.com:8051 \
  -e CORE_PEER_LOCALMSPID=FirmBMSP \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/firmb.pangochain.com/peers/peer0.firmb.pangochain.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/firmb.pangochain.com/users/Admin@firmb.pangochain.com/msp \
  fabric-cli peer channel join \
  -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/legal-channel.block

# Join Regulator
docker exec -e CORE_PEER_ADDRESS=peer0.regulator.pangochain.com:9051 \
  -e CORE_PEER_LOCALMSPID=RegulatorMSP \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.pangochain.com/peers/peer0.regulator.pangochain.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.pangochain.com/users/Admin@regulator.pangochain.com/msp \
  fabric-cli peer channel join \
  -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/legal-channel.block

log "All peers joined legal-channel."

# ─── 6. Update anchor peers ───────────────────────────────────────────────────
log "Updating anchor peers..."

ORDERER_TLS="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/orderer.pangochain.com/orderers/orderer.pangochain.com/tls/ca.crt"

docker exec fabric-cli peer channel update \
  -o orderer.pangochain.com:7050 -c legal-channel \
  -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/FirmAMSPanchors.tx \
  --tls --cafile "$ORDERER_TLS"

docker exec -e CORE_PEER_ADDRESS=peer0.firmb.pangochain.com:8051 \
  -e CORE_PEER_LOCALMSPID=FirmBMSP \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/firmb.pangochain.com/peers/peer0.firmb.pangochain.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/firmb.pangochain.com/users/Admin@firmb.pangochain.com/msp \
  fabric-cli peer channel update \
  -o orderer.pangochain.com:7050 -c legal-channel \
  -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/FirmBMSPanchors.tx \
  --tls --cafile "$ORDERER_TLS"

docker exec -e CORE_PEER_ADDRESS=peer0.regulator.pangochain.com:9051 \
  -e CORE_PEER_LOCALMSPID=RegulatorMSP \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.pangochain.com/peers/peer0.regulator.pangochain.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.pangochain.com/users/Admin@regulator.pangochain.com/msp \
  fabric-cli peer channel update \
  -o orderer.pangochain.com:7050 -c legal-channel \
  -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/RegulatorMSPanchors.tx \
  --tls --cafile "$ORDERER_TLS"

log "Anchor peers updated."
log ""
log "════════════════════════════════════════════"
log "  PangoChain network is UP on legal-channel"
log "  Run deploy-chaincode.sh next"
log "════════════════════════════════════════════"
