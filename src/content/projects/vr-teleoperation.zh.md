---
title: 机器人 VR 遥操作平台
summary: 基于 Meta Quest 的机器人远程操控应用与实时通信基础设施：操作员、机器人和观察者在同一个 LiveKit 房间中相遇；一套与机器人无关的接口可驱动 xArm 机械臂和配备灵巧手的人形机器人，一键即可在机器人之间切换。
role: 创始工程师，端到端设计并实现整个平台：Quest 应用（Unity + OpenXR）、LiveKit 房间架构、与机器人无关的遥操接口与机器人桥接、手柄标定，以及数据采集流程。
brief: 在 Quest 头显中遥操作机器人：一条与机器人无关的遥操指令经 LiveKit 房间传输，同一个应用就能控制不同的机器人，其他人也能实时观看。
facts: 200 Hz :: 遥操指令频率 || 30 fps :: 机器人相机画面 || 3 台 :: 同一房间实测机器人数
---

## 速览

- **是什么**：通过 Meta Quest 头显实时遥操作机器人，视频、音频与数据双向实时传输
- **为什么**：遥操作是为机器人学习采集高质量演示数据、以及操控远处机器人的最直接方式
- **主要组成**：Meta Quest 3 上的 Unity + OpenXR 应用 · 操作员、机器人、观察者都是 LiveKit 房间中的参与者 · 一套接口适配不同机器人 · 控制 200 Hz、视频 30 fps · 同一房间最多 3 台机器人，一键切换

## 用通俗的话介绍技术组件

平台由几项技术组合而成，先了解每项技术的作用会更容易理解：

| 技术组件 | 是什么 | 在这里的作用 |
| --- | --- | --- |
| **Meta Quest 3** | 一体式头显，能在 3D 空间中追踪头部、双手和两只手柄，并能通过摄像头显示真实环境（混合现实） | 操作员的输入设备与显示器 |
| **OpenXR** | XR 设备的开放标准，相当于应用与设备之间的"通用语言" | 读取头部、手部与手柄追踪数据，不被某一家厂商的 SDK 绑定 |
| **Unity** | 实时 3D 引擎，广泛用于游戏与 XR | 构建应用：浮动面板、视频画面与交互输入 |
| **LiveKit** | 基于 **WebRTC**（浏览器视频通话所用的技术）的开源实时通信平台 | 在会话中的所有成员之间传输视频、音频和控制数据 |
| **房间 / 参与者** | LiveKit 的模型：*房间*就像一场视频会议，里面的每个成员都是*参与者*，可以发布自己的流、订阅他人的流 | 操作员、机器人和观察者都加入同一个房间 |
| **可靠 vs. 不可靠消息** | 可靠消息一定会送达，但可能延迟；不可靠消息要么很快送达，要么直接丢弃 | 遥操指令走不可靠通道（只有最新位姿有意义）；确认消息与文本走可靠通道 |

衡量响应速度的两个数字：操作员的指令**每秒发送 200 次（200 Hz）**，机器人相机以**每秒 30 帧**传输画面。

## 房间架构

<figure class="figure-media">
<a href="./images/projects/vr-teleop/room-architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/vr-teleop/room-architecture.svg" alt="房间示意图：令牌服务只为已认证用户签发访问权限；自建 LiveKit 服务器托管房间；房间内，遥操作员以 200 Hz 向选中的机器人 A 发送遥操指令，并接收相机视频、音频与确认消息；机器人 B、C 待命；数据采集看板等观察者接收实时视频；云端语音助手与操作员对话" loading="lazy"></a>
<figcaption>房间里有谁、彼此之间传输什么。这是逻辑视图，物理上所有数据流都经过 LiveKit 服务器转发。</figcaption>
</figure>

每次会话都发生在自建 **LiveKit 服务器**上的一个**房间**里。一个小型**令牌服务**负责发放访问权限，**只有经过认证的用户才能加入**。进入房间后，每个成员都是**参与者**：

- **遥操作员**：Quest 应用。以 200 Hz 发布**遥操指令**，同时发布头显相机与麦克风，并订阅机器人的视频、音频与确认消息。
- **机器人**：每台机器人通过自己的**机器人桥接**加入。桥接把遥操指令翻译成该机器人的控制命令，并发布它的相机、麦克风和 **ACK**（指令已送达的确认）。
- **观察者**：只能观看的参与者。主要是团队的**数据采集看板**，一个显示房间内实时相机画面的网页，也可以在头显中直接打开；其他头显也可以加入观看。
- **云端语音助手**：可以与操作员对话的参与者，发送语音合成的文本和音频。

由于机器人只是参与者，**多台机器人可以共享一个房间**。操作员在列表中选择一台，应用就只向这台机器人发送遥操指令；其他机器人收不到指令，保持当前姿态。我测试过**一个房间 3 台机器人**，架构本身并不限于此。

<figure class="figure-media figure-medium">
<img src="./images/projects/vr-teleop/dashboard.jpg" alt="头显面板中的数据采集看板网页：房间配置（房间名与 Join Room 按钮）与发布者选择" loading="lazy">
<figcaption>在头显中打开的数据采集看板：加入房间，再选择要观看哪个参与者的画面。</figcaption>
</figure>

## 头显应用内部

<figure class="figure-media">
<a href="./images/projects/vr-teleop/client-architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/vr-teleop/client-architecture.svg" alt="三层客户端架构：连接层 LiveKitRoomManager；数据接入层 LiveKitPublisher 与 LiveKitSubscriber；界面层中 DataSource、VideoSource、AudioSource 输入发布者，订阅者输出到 DataSink、VideoSink、AudioSink" loading="lazy"></a>
<figcaption>Quest 应用的三层结构：连接房间、收发数据流、展示给操作员。</figcaption>
</figure>

应用分为三层，每一层都可以独立修改而不影响其他层：

1. **连接层**：`LiveKitRoomManager` 负责加入房间，并跟踪房间里还有谁。
2. **数据接入层**：`LiveKitPublisher` 发送头显自己的数据流，`LiveKitSubscriber` 接收其他参与者的数据流。
3. **界面 / 展示层**：*Source* 产生操作员要发送的内容（遥操指令、头显相机、麦克风）；*Sink* 把收到的内容变成操作员能看到、听到的东西：机器人相机的浮动视频面板、机器人音频、语音助手，以及来自 ACK 的状态文本。

<figure class="figure-media">
<img src="./images/projects/vr-teleop/headset-streams.jpg" alt="头显内：网页面板中的腕部相机实时画面、显示 Arducam USB 相机画面的相机面板，以及曝光、ISO、亮度、对比度、饱和度和白平衡调节面板" loading="lazy">
<figcaption>头显内：房间里的实时画面（左），以及接入 Quest 的 USB 相机（中）和在头显里直接调节的曝光、ISO 与白平衡（右）。</figcaption>
</figure>

头显还可以采集**接入 Quest 的 USB（UVC）相机**，曝光、ISO、亮度和白平衡都能在 VR 中直接调节。我的 [EGO 数据采集](#/projects/ego-data-collection)正是基于这一能力。**混合现实透视**让真实环境始终显示在面板周围，操作员不会失去对自身位置的感知。

## 一套接口，适配多种机器人

应用从不直接与某台具体机器人通信，而是发送一条**与机器人无关的遥操指令**：每只手或手柄的目标位姿、夹爪或手指状态，以及按键标志。每台机器人的**桥接**再把这条指令翻译给自己的硬件：

- **xArm 7 机械臂**：桥接 → xArm 控制器，每只手对应一条机械臂，可单臂，也可双臂工作台
- **配备 Wuji 灵巧手的人形机器人**：桥接 → 手臂与灵巧手控制器，手指由手部追踪驱动

接入新机器人只需编写新的桥接，无需修改应用。

**手柄标定**：每个人握手柄的方式不同，有些装置上手柄还有特定的安装方式，同样的物理动作就可能得到旋转过的坐标轴。**标定矩阵**把手柄的实际握持姿态映射到桥接所期望的标准坐标轴，每套装置只需设置一次。之后的手部遥操作也沿用同一套对齐来使用[掌心位姿](#/projects/ego-data-collection)。

## 演示

### 在同一房间内切换机器人

<figure class="figure-media figure-medium">
<video data-src="./images/projects/vr-teleop/fleet-switching.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="头显视角：操作员操控一组 xArm 7 双臂，在头顶的面板中点击另一台机器人，然后操控第二台机器人"></video>
<figcaption>同一房间中的两台 xArm 7 机器人：操作员操控其中一台，在头顶面板中点击切换后操控另一台。白色矩形是头显录屏无法捕获的实时视频面板。1.5 倍速。</figcaption>
</figure>

### xArm 上的手柄标定与实时视频

<figure class="figure-media">
<video data-src="./images/projects/vr-teleop/xarm-calibration.mp4" muted loop playsinline preload="none" aria-label="头显视角：带标定设置的 LiveKit 连接面板、手柄坐标轴、机器人相机实时缩略图，以及跟随手柄运动的 xArm"></video>
<figcaption>手部遥操作的预测试：标定后的手柄坐标轴、房间面板、机器人相机实时画面（右上），以及跟随手柄运动的 xArm。1.5 倍速。</figcaption>
</figure>

### 人形机器人上的手部遥操作与数据采集

同一平台也能驱动配备 **Wuji 灵巧手**的人形机器人（由 [Theta Intelligence](https://www.theta-intelligence.com/) 提供），使用徒手追踪而非手柄。完整的数据采集流程都在头显中完成：

- **脚踏板**通过 BLE 与 Quest 配对，用于启用每条手臂、开始或结束录制，双手始终空出来操作。
- 每条演示由**机器人端录制**：它的相机、关节状态以及收到的指令。
- 结束录制后，操作员拿起手柄为本条演示**打标**（保存或丢弃），并让手臂**复位**，准备下一条。

<figure class="figure-media">
<video data-src="./images/projects/vr-teleop/humanoid-hand-teleop.mp4" muted loop playsinline preload="none" aria-label="人形机器人数据采集分步演示：连接房间、切换为手部追踪、用脚踏板进行双臂手部遥操作、录制、打标与复位"></video>
<figcaption>完整流程分步演示：连接、切换为手部追踪、对齐并踩踏板启用、录制、打标与复位。已加速（2–3 倍），并剪掉了重复的第二条录制。人脸已打码。</figcaption>
</figure>

## 设计取舍

- **所有人都是房间参与者**：机器人、操作员和观察者加入同一个 LiveKit 房间，增加一台机器人或一个观看者只需加入房间，无需搭建新的基础设施。
- **与机器人无关的统一遥操消息**：头显向所有机器人发送同一种指令，由各机器人的桥接程序映射到自身关节，因此切换机器人只需一键。
- **控制走不可靠通道**：只有最新位姿有意义，所以 200 Hz 的遥操指令走不可靠通道；迟到的指令直接丢弃，而不是排在更新的指令后面。
- **在遥操应用内录制**：录制、标注和复位都在同一个头显会话中完成，因此这个平台同时产出机器人学习数据，与我的 [UMI](#/projects/umi-data-collection) 和 [EGO](#/projects/ego-data-collection) 采集装置互补。

## 相关项目

- [EGO 数据采集](#/projects/ego-data-collection)：在本平台上验证的手部追踪与掌心位姿
- [UMI 数据采集](#/projects/umi-data-collection)：由同类头显状态机驱动的手持夹爪数据采集
