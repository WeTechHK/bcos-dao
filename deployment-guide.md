# BCOS DAO 生产部署文档

本文档详细描述了 BCOS DAO 项目的生产环境部署流程，包括智能合约部署、前端部署以及治理代币分发。

## 目录

1. [准备工作](#准备工作)
2. [智能合约部署](#智能合约部署)
   - [配置部署环境](#配置部署环境)
   - [部署合约](#部署合约)
   - [验证合约部署](#验证合约部署)
   - [更新前端配置](#更新前端配置)
3. [前端部署到 AWS Amplify](#前端部署到-aws-amplify)
   - [准备 AWS 账户](#准备-aws-账户)
   - [配置 AWS Amplify](#配置-aws-amplify)
   - [部署前端应用](#部署前端应用)
   - [配置自定义域名（可选）](#配置自定义域名可选)
4. [治理代币分发](#治理代币分发)
   - [分发策略](#分发策略)
   - [执行分发](#执行分发)
5. [部署后验证](#部署后验证)
6. [常见问题与解决方案](#常见问题与解决方案)

## 准备工作

在开始部署之前，请确保您已准备好以下内容：

1. 用于部署合约的以太坊账户私钥
2. 目标网络的 RPC URL
3. 足够的原生代币用于支付部署和交互的 gas 费用
4. Git 仓库访问权限
5. Node.js 环境（推荐 v18 或更高版本）
6. AWS 账户（用于 Amplify 部署）
7. 域名（可选，用于自定义前端 URL）

## 智能合约部署

### 配置部署环境

1. 克隆项目仓库并安装依赖：

```bash
git clone https://github.com/your-org/bcos-dao.git
cd bcos-dao
yarn install
```

2. 在项目根目录创建 `.env` 文件，配置部署私钥和其他必要参数：

```
__RUNTIME_DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere
NEXT_PUBLIC_CHAIN_RPC_URL=https://your-target-network-rpc-url
NEXT_PUBLIC_BLOCK_EXPLORERS_URL=https://your-block-explorer-url
TIMER_UNIT=1
```

注意：`TIMER_UNIT` 参数用于设置时间单位，默认为 1（秒）。在测试环境中可以设置更小的值以加速治理流程。

### 部署合约

BCOS DAO 项目包含多个智能合约，它们按照以下顺序部署：

1. ERC20VotePower - 治理代币
2. CustomTimelockControllerUpgradeable - 时间锁控制器
3. TimeSetting - 时间设置
4. BCOSGovernor - 主治理合约

使用以下命令部署所有合约：

```bash
cd packages/hardhat
npx hardhat deploy --network dev_net
```

这将按照 `deploy` 目录中脚本的顺序部署所有合约。部署过程中会输出每个合约的地址和交易哈希。

部署参数说明：

- **ERC20VotePower**：
  - 名称：`ERC20Vote`
  - 符号：`EVP`
  - 时间设置：TimeSetting 合约地址

- **CustomTimelockControllerUpgradeable**：
  - 最小延迟：10 分钟（600 秒）

- **TimeSetting**：
  - 时间单位：由 `TIMER_UNIT` 环境变量设置，默认为 1

- **BCOSGovernor**：
  - 投票延迟：0（无延迟）
  - 投票周期：12 小时
  - 提案阈值：3000 代币
  - 初始代币池：10000 代币
  - 法定人数：30%（提案阈值/初始代币池）

### 验证合约部署

部署完成后，可以使用以下命令验证合约是否正确部署：

```bash
npx hardhat verify --network dev_net <合约地址>
```

或者使用区块浏览器验证合约代码。

### 更新前端配置

合约部署后，前端配置文件会自动更新。检查 `packages/nextjs/contracts/deployedContracts.ts` 文件，确保其包含最新部署的合约地址和 ABI。

如果需要手动更新网络配置，编辑 `packages/nextjs/scaffold.config.ts` 文件：

```typescript
const scaffoldConfig = {
  targetNetworks: [
    {
      id: 30303, // 目标网络的链 ID
      name: "BCOS Mainnet", // 网络名称
      nativeCurrency: {
        decimals: 18,
        name: "BCOS Token",
        symbol: "POT",
      },
      rpcUrls: {
        default: { http: [process.env.NEXT_PUBLIC_CHAIN_RPC_URL || "https://your-rpc-url"] },
      },
      blockExplorers: {
        default: {
          name: "BCOS Explorer",
          url: process.env.NEXT_PUBLIC_BLOCK_EXPLORERS_URL || "https://your-explorer-url",
        },
      },
    },
  ],
  // 其他配置...
};
```

## 前端部署到 AWS Amplify

### 准备 AWS 账户

1. 确保您有一个有效的 AWS 账户
2. 安装并配置 AWS CLI：

```bash
pip install awscli
aws configure
```

### 配置 AWS Amplify

1. 安装 Amplify CLI：

```bash
npm install -g @aws-amplify/cli
amplify configure
```

2. 在项目的 `packages/nextjs` 目录中初始化 Amplify：

```bash
cd packages/nextjs
amplify init
```

按照提示配置项目名称、环境等信息。

3. 添加托管服务：

```bash
amplify add hosting
```

选择 "Hosting with Amplify Console" 和 "Continuous deployment"。

### 部署前端应用

有两种方式部署前端应用：

#### 方式一：通过 Amplify CLI

```bash
amplify publish
```

#### 方式二：通过 AWS Amplify 控制台（推荐）

1. 登录 AWS 管理控制台，进入 Amplify 服务
2. 点击 "Connect app"
3. 选择您的代码仓库提供商（GitHub、BitBucket、GitLab 等）
4. 授权 AWS Amplify 访问您的仓库
5. 选择 bcos-dao 仓库和主分支
6. 配置构建设置：

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd packages/nextjs
        - yarn install
    build:
      commands:
        - yarn build
  artifacts:
    baseDirectory: packages/nextjs/.next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - packages/nextjs/node_modules/**/*
```

7. 点击 "Save and deploy"

### 配置自定义域名（可选）

1. 在 AWS Amplify 控制台中，选择您的应用
2. 点击 "Domain management"
3. 点击 "Add domain"
4. 输入您的域名并按照向导完成配置
5. 在您的域名注册商处，添加 AWS Amplify 提供的 DNS 记录

## 治理代币分发

### 分发策略

治理代币（ERC20VotePower）在部署时已经铸造了初始数量：
- 提案阈值数量（3000 代币）分配给部署者账户
- 剩余代币（7000 代币）分配给时间锁控制器

为了分发治理代币给相关角色，您需要使用部署者账户或通过治理提案执行分发。

### 执行分发

#### 方式一：使用部署者账户直接分发

部署者账户拥有代币合约的所有者权限，可以直接铸造代币：

1. 连接到前端应用
2. 使用部署者账户登录
3. 导航到代币管理页面
4. 使用 "Mint" 功能为每个角色铸造代币

或者，使用脚本进行分发：

```javascript
// distribute-tokens.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // 获取 ERC20VotePower 合约实例
  const ERC20VotePower = await ethers.getContractFactory("ERC20VotePower");
  const tokenContract = await ERC20VotePower.attach("已部署的ERC20VotePower地址");
  
  // 定义角色和分配数量
  const distributions = [
    { role: "管理员", address: "0x...", amount: ethers.utils.parseEther("1000") },
    { role: "开发者", address: "0x...", amount: ethers.utils.parseEther("500") },
    { role: "社区成员", address: "0x...", amount: ethers.utils.parseEther("300") },
    // 添加更多角色...
  ];
  
  // 执行分发
  for (const dist of distributions) {
    console.log(`分发 ${ethers.utils.formatEther(dist.amount)} 代币给 ${dist.role} (${dist.address})`);
    await tokenContract.mint(dist.address, dist.amount);
  }
  
  console.log("代币分发完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

执行脚本：

```bash
cd packages/hardhat
npx hardhat run scripts/distribute-tokens.js --network dev_net
```

#### 方式二：通过治理提案分发

对于更去中心化的方法，可以通过治理提案分发代币：

1. 连接到前端应用
2. 使用有足够投票权的账户登录
3. 创建一个新提案，调用 `mintToken` 函数
4. 提案通过后，执行提案以完成分发

## 部署后验证

完成部署后，执行以下验证步骤：

1. 访问部署的前端应用
2. 连接钱包并确认能够正确显示治理代币余额
3. 创建测试提案并验证提案流程
4. 测试投票功能
5. 测试提案执行功能

## 常见问题与解决方案

### 合约部署失败

- 检查部署账户是否有足够的原生代币支付 gas 费用
- 确认私钥配置正确
- 检查网络连接是否稳定

### 前端无法连接到合约

- 验证 `deployedContracts.ts` 文件中的合约地址是否正确
- 确认 RPC URL 配置正确且可访问
- 检查网络 ID 配置是否与目标网络匹配

### AWS Amplify 部署失败

- 检查构建配置是否正确
- 查看构建日志以识别具体错误
- 确保 AWS 账户有足够的权限

### 治理代币分发问题

- 确认使用的账户有铸造权限
- 检查代币合约是否已暂停
- 验证接收地址格式是否正确