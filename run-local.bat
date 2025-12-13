@echo off
echo Building and starting Postiz with Docker Compose...
echo This may take a few minutes on the first run...

REM 构建并启动所有服务
docker-compose -f docker-compose.local.yaml up --build

echo.
echo Postiz is now running!
echo Access it at: http://localhost:5000
echo.
echo To stop the services, press Ctrl+C or run 'docker-compose -f docker-compose.local.yaml down' in another terminal