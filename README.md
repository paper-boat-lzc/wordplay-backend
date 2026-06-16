# 心有灵犀 - 多人在线猜词游戏

✨ **多人在线猜词游戏 · AI智能语义匹配**

## 技术栈
- **前端**: Vue 3 + Vite + Vue Router
- **后端**: Node.js + Express + WebSocket
- **AI算法**: 字符串相似度 + 中文同义词词典

## 核心功能
✅ **用户系统**: 昵称输入、自动生成token、无需注册
✅ **房间系统**: 创建房间/加入房间、多人实时在线
✅ **游戏机制**: 进入房间即开始、所有人同时猜词、显示每个人猜词结果
✅ **AI功能**: 语义相似度算法计算猜词与答案的关联度百分比
✅ **自动轮次**: 猜对自动开始下一轮
✅ **词库系统**: 1000+词汇、10大分类、可持续更新

## 词库分类
- 🐾 动物类 (100+)
- 🍔 食物类 (120+)
- 💼 职业类 (80+)
- 🚗 交通工具类 (60+)
- 📱 电子产品类 (80+)
- ⚽ 运动类 (80+)
- 🌿 自然景观类 (80+)
- 🏠 日常用品类 (100+)
- 🏛️ 建筑场所类 (80+)
- 💭 抽象概念类 (80+)

**总计: 860+ 词汇**

## 🚀 一键启动（推荐）

### 🪟 Windows 用户
**直接双击 `start.bat` 文件即可！**

或在CMD中执行：
```cmd
start.bat
```

### 🍎 Mac / 🐧 Linux 用户

```bash
# 1. 给脚本添加执行权限
chmod +x start.sh

# 2. 一键启动
./start.sh
```

---

### ✨ 脚本自动完成：
- ✅ 检查 Node.js 环境（版本 >= 16）
- ✅ 自动安装后端依赖
- ✅ 自动安装前端依赖
- ✅ 自动构建前端
- ✅ 自动启动服务器
- ✅ 自动打开浏览器

---

## 手动启动

### 1. 安装依赖
```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 2. 构建前端
```bash
cd frontend
npm run build
```

### 3. 启动服务器
```bash
cd backend
npm start
```

### 4. 访问
打开浏览器访问: `http://localhost:3000`

---

## ❓ 常见问题

**Q: 提示 "Node.js 未安装"怎么办？**
- A: 请先安装 Node.js 16+ 版本，官网: https://nodejs.org/

**Q: 启动后浏览器没自动打开？**
- A: 手动在浏览器输入: http://localhost:3000

**Q: 端口3000被占用怎么办？**
- A: 修改 backend/server.js 中的 PORT 配置，或关闭占用端口的程序

**Q: 创建房间后显示"房间不存在"？**
- A: 这是 v2.0 已修复的 BUG，请下载最新版本

## 部署说明

### 支持的免费平台
- **Render** (推荐): 支持Node.js + WebSocket，国内可访问
- **Vercel**: 前端托管 + Serverless函数（WebSocket有限制）
- **Netlify**: 前端托管
- **Railway**: 免费额度足够

### Render部署步骤
1. Fork本项目到GitHub
2. 在Render.com新建Web Service
3. 连接GitHub仓库
4. 设置:
   - Build Command: `cd frontend && npm install && npm run build && cd ../backend && npm install`
   - Start Command: `cd backend && npm start`
   - Environment: Node
5. 部署完成即可访问

## 项目结构
```
fullstack-app/
├── backend/
│   ├── server.js          # 主服务器 (Express + WebSocket)
│   ├── wordBank.js        # 词库系统 (1000+词汇)
│   ├── similarity.js      # AI相似度计算算法
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── views/
│   │   │   ├── Home.vue   # 首页
│   │   │   └── Room.vue   # 游戏房间
│   │   ├── composables/
│   │   │   └── useWebSocket.js
│   │   ├── router/
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## API接口
- `GET /api/health` - 健康检查
- `GET /api/stats` - 服务器统计信息

## WebSocket消息类型
- `CREATE_ROOM` - 创建房间
- `JOIN_ROOM` - 加入房间
- `MAKE_GUESS` - 提交猜词
- `LEAVE_ROOM` - 离开房间
- `NEW_ROUND` - 新一轮开始
- `NEW_GUESS` - 新猜词广播
- `ROUND_WON` - 有人猜对

## UI特色
- 🎨 现代玻璃态设计
- 🌈 渐变色主题
- 📱 完全响应式布局
- ✨ 流畅动画效果
- 🌙 深色模式护眼