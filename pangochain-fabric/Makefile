# PangoChain Fabric Network — make targets
# Run from pangochain-fabric/ directory in WSL2 or Git Bash

.PHONY: up down clean chaincode smoke logs

up:
	@bash scripts/start-network.sh

chaincode:
	@bash scripts/deploy-chaincode.sh

smoke:
	@echo "Smoke-testing legalcc chaincode..."
	docker exec fabric-cli peer chaincode query \
	  --channelID legal-channel --name legalcc \
	  -c '{"function":"CheckAccess","Args":["CASE-SMOKE-001","admin","FirmAMSP"]}' \
	  --tls \
	  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/orderer.pangochain.com/orderers/orderer.pangochain.com/tls/ca.crt

down:
	docker-compose -f docker-compose.fabric.yml down -v --remove-orphans
	docker rm -f legalcc 2>/dev/null || true

clean: down
	rm -rf crypto-config channel-artifacts

logs:
	docker-compose -f docker-compose.fabric.yml logs -f --tail=50

all: up chaincode
