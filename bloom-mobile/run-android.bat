@echo off
REM Bloom Mobile - Android build s nastavenym JAVA_HOME
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-25.0.2.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

echo JAVA_HOME=%JAVA_HOME%
java -version
echo.
echo Spoustim Android build...
npx expo run:android --port 8083
