call npm run publish
cd dist
robocopy win-ia32-unpacked\resources\app app *.* /s
robocopy nsis-web . *.* /s
paker -d ./app -o ./