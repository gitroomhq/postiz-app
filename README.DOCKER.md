# 在本地使用 Docker 运行 Postiz

本指南将帮助您在本地环境中使用 Docker 运行 Postiz 应用。

## 先决条件

1. 安装 Docker Desktop（Windows/macOS）或 Docker Engine（Linux）
2. 确保 Docker 服务正在运行

## 启动服务

有两种方式启动 Postiz：

### 方式一：使用批处理脚本（Windows）

双击运行以下脚本：
- **启动服务**: `run-local.bat`
- **停止服务**: `stop-local.bat`

### 方式二：使用命令行

在项目根目录打开终端，运行以下命令：

```bash
# 构建并启动所有服务
docker-compose -f docker-compose.local.yaml up --build

# 停止并移除所有服务
docker-compose -f docker-compose.local.yaml down
```

## 访问应用

启动后，您可以通过以下地址访问 Postiz：
- **Web 界面**: http://localhost:5000

## 服务说明

- **Postiz 应用**: 运行在端口 5000
- **PostgreSQL 数据库**: 运行在端口 5432
- **Redis**: 运行在端口 6379

## 首次运行

首次运行时，Docker 将：
1. 构建 Postiz 镜像（可能需要 10-15 分钟）
2. 下载 PostgreSQL 和 Redis 镜像
3. 初始化数据库
4. 启动所有服务

请注意：首次构建需要从网络下载大量依赖项，请确保网络连接稳定。

## 故障排除

### 1. 端口冲突
如果遇到端口冲突错误，请修改 [docker-compose.local.yaml](docker-compose.local.yaml) 中的端口映射。

### 2. 构建失败
如果构建失败，请确保：
- Docker 有足够资源（建议至少 4GB 内存）
- 网络连接正常（需要下载依赖包）
- 检查 Docker Desktop 是否有足够的磁盘空间

### 3. 数据库连接失败
如果应用无法连接数据库，请检查：
- 数据库服务是否正常运行
- 环境变量中的数据库连接字符串是否正确

## 数据持久化

数据将保存在 Docker 卷中，即使容器被删除也不会丢失：
- PostgreSQL 数据: `postgres-volume`
- Redis 数据: `postiz-redis-data`
- 上传文件: `postiz-uploads`
- 配置文件: `postiz-config`

## 日志查看

查看服务日志：

```bash
# 查看所有服务日志
docker-compose -f docker-compose.local.yaml logs

# 查看特定服务日志
docker-compose -f docker-compose.local.yaml logs postiz

# 实时查看日志
docker-compose -f docker-compose.local.yaml logs -f
```