@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements. See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership. The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License. You may obtain a copy of the License at
@REM
@REM http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied. See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_ARG0_NAME__%"=="" (SET "__MVNW_ARG0_NAME__=%~nx0")
@SET ___MVNW_MESS_=
@SET ___MVNW_EXE_=
@SET ___MVNW_BASE_=
@SET ___MVNW_REPO_=

@IF NOT "%MVNW_REPOURL%" == "" (
  SET "___MVNW_REPO_=%MVNW_REPOURL%"
) ELSE (
  SET "___MVNW_REPO_=https://repo.maven.apache.org/maven2"
)

@SET ___MVNW_SETTINGS_=
@IF NOT "%MAVEN_SETTINGS%" == "" (
  SET "___MVNW_SETTINGS_=--settings %MAVEN_SETTINGS%"
)

@SET ___MVNW_QUIET_=
@IF "%MVNW_VERBOSE%" == "true" (
  SET ___MVNW_QUIET_=
) ELSE (
  SET "___MVNW_QUIET_=--quiet"
)

@SET WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
@SET WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

@SET DOWNLOAD_URL="%___MVNW_REPO__%/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar"

@FOR /F "usebackq tokens=1,2 delims==" %%A IN ("%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties") DO (
  IF "%%A"=="wrapperUrl" SET DOWNLOAD_URL="%%B"
)

@REM Find the project base dir, i.e. the directory that contains the folder ".mvn".
@REM Fallback to current directory if not found.

@SET MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%
IF NOT "%MAVEN_PROJECTBASEDIR%" == "" GOTO endDetectBaseDir

@SET "EXEC_DIR=%CD%"
@SET "WD=%EXEC_DIR%"
:findBaseDir
IF EXIST "%WD%"\.mvn GOTO foundBaseDir
cd ..
IF "%WD%"=="%CD%" GOTO baseDirNotFound
SET "WD=%CD%"
GOTO findBaseDir

:foundBaseDir
SET "MAVEN_PROJECTBASEDIR=%WD%"
cd "%EXEC_DIR%"
GOTO endDetectBaseDir

:baseDirNotFound
SET "MAVEN_PROJECTBASEDIR=%EXEC_DIR%"
cd "%EXEC_DIR%"

:endDetectBaseDir

IF NOT EXIST "%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar" (
  IF NOT "%MVNW_REPOURL%" == "" (
    SET "DOWNLOAD_URL=%MVNW_REPOURL%/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar"
  )
  @powershell -Command "&{"^
    "$webclient = new-object System.Net.WebClient;"^
    "if (-not ([string]::IsNullOrEmpty('%MVNW_USERNAME%') -and [string]::IsNullOrEmpty('%MVNW_PASSWORD%'))) {"^
    "$webclient.Credentials = new-object System.Net.NetworkCredential('%MVNW_USERNAME%', '%MVNW_PASSWORD%');"^
    "}"^
    "Invoke-WebRequest -UseBasicParsing -Uri %DOWNLOAD_URL% -OutFile '%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar'"^
    "}"
  IF "%MVNW_VERBOSE%" == "true" echo Downloaded maven-wrapper.jar
)

@IF EXIST "%JAVA_HOME%\bin\java.exe" (
  SET "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
) ELSE (
  SET "JAVA_EXE=java"
)

@IF NOT EXIST "%JAVA_HOME%\bin\java.exe" (
  where java >NUL 2>&1
  IF ERRORLEVEL 1 (
    ECHO Error: JAVA_HOME is not set and no 'java' command could be found in your PATH.
    ECHO Please set the JAVA_HOME variable in your environment to match the
    ECHO location of your Java installation.
    EXIT /B 1
  )
)

%JAVA_EXE% %JVM_CONFIG_MAVEN_PROPS% %MAVEN_OPTS% %MAVEN_DEBUG_OPTS% -classpath "%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" %WRAPPER_LAUNCHER% %MAVEN_CONFIG% %*
