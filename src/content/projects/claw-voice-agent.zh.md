---
title: Coglet 机器人的 ESP32 AI 智能体与控制模块
summary: 我复刻了 Will Cogley 设计的开源陪伴机器人 Coglet，并基于乐鑫 ESP-Claw 框架，在 ESP32-S3 上为它开发了 AI 智能体和控制模块。
role: 按开源设计复刻 Coglet 硬件，再搭建智能体与控制层：I²C 舵机接线、ESP-Claw 移植、支持技能和任务录制回放的示教器、让智能体调用动作的 Lua 桥接、浏览器端摄像头与音频推流，以及视觉模块接入。
brief: ESP32-S3 上的 LLM 智能体把日常用语转成开源机器人 Coglet 的录制动作，并读取板载视觉模块的检测结果。
facts: 9 个舵机 :: 通过 2 根 I²C 线驱动，视觉模块共用 || 约 21 ms :: 视觉模块单帧检测推理耗时 || 640 × 480 :: 浏览器 MJPEG 摄像头画面，30 fps
---

## 概要

邮票大小的 XIAO ESP32-S3 上运行着一个 LLM 智能体，能按日常用语控制 Coglet 机器人。[Coglet](https://www.kickstarter.com/projects/willcogley/coglet-open-source-3d-printable-robot-companion-kit) 是 Will Cogley 设计的开源陪伴机器人。我复刻了它的硬件，并基于乐鑫 ESP-Claw 框架开发了 AI 智能体和控制模块。

微控制器只有几百 KB 片上内存和几 MB PSRAM。让 LLM 实时设定九个舵机的角度，又慢又不可靠，成本也高。

ESP-Claw 用 C 语言在芯片上运行智能体循环，只在需要推理时通过 Wi-Fi 调用云端 LLM。LLM 从示教器录好的命名动作中挑选一个，再由 Lua 脚本让舵机回放。Grove Vision AI V2 模块用自带的神经网络处理器运行检测，只经 I²C 发回结果。

在一次终端会话中，智能体读取自身硬件，报告剩余 PSRAM 6.20 MB（共约 6.49 MB）。两句没提动作名的请求，分别触发了*困倦*和*寻找*动作。浏览器收到 640 × 480、30 fps 的 MJPEG 视频，以及 16 kHz PCM 音频。视觉模块上的检测推理每帧约 21 ms。

这次实践说明，邮票大小的开发板也能让智能体驱动真实机器人。前提是 LLM 只在测试过的动作之间挑选。

## 设计取舍

| 环节 | 常见做法 | 本项目做法 | 本项目结果 |
| --- | --- | --- | --- |
| 动作控制 | LLM 实时设定舵机角度 | LLM 挑选命名的技能或任务，由 Lua 脚本回放 | 未提动作名的请求触发了对应动作 |
| 舵机脉冲 | MCU 自己产生脉冲 | PCA9685 根据 I²C 指令产生 12 位 PWM，最多驱动 16 个舵机 | 9 个舵机和视觉模块共用 2 根 I²C 线 |
| 感知 | 视频传出机器人再处理 | Grove Vision AI V2 在 Ethos-U55 神经网络处理器上运行检测 | 每帧约 21 ms，总线上只传检测框、标签和置信度 |
| 远程查看 | 安装专用应用 | 机器人提供网页，推送 MJPEG 视频和 PCM 音频 | 局域网内任意浏览器可看 640 × 480、30 fps 画面，听 16 kHz 音频 |

LLM 从不直接接触舵机角度。命名并录制好的技能让行为可靠、安全。模型擅长选出正确的动作，却不擅长生成平滑的舵机轨迹。

有了 PSRAM，ESP32-S3 可以同时运行智能体循环、记忆、网页服务器、摄像头推流和电机控制。重度推理交给云端 LLM。

## 系统架构

ESP32-S3 通过一条 I²C 总线向两颗辅助芯片发指令：PCA9685 舵机驱动板和 Grove Vision AI V2。

<figure class="figure-media">
<a href="./images/projects/coglet/wiring.svg" target="_blank" rel="noreferrer"><img src="./images/projects/coglet/wiring.svg" alt="接线图：XIAO ESP32-S3 的 3V3、GND、GPIO5、GPIO6 分别接 PCA9685 的 VCC、GND、SDA、SCL；Grove Vision AI V2 共用 SDA 和 SCL；独立的 5 V 电源经 PCA9685 接线端子给舵机供电；9 个舵机接在通道 0-2、4-6、8-10" loading="lazy"></a>
<figcaption>两根 I²C 线（SDA 接 GPIO5，SCL 接 GPIO6）承载全部控制信号。舵机由独立的 5 V 电源供电，与开发板只共地。</figcaption>
</figure>

<details>
<summary>硬件与接线</summary>

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/xiao-esp32s3-sense.jpg" alt="Seeed XIAO ESP32-S3 Sense：拇指大小的开发板，带摄像头模组和 USB-C 接口" loading="lazy"><figcaption>XIAO ESP32-S3 Sense：双核 MCU，带 Wi-Fi、额外的 PSRAM、摄像头和麦克风。产品图。</figcaption></figure>
<figure class="figure-media"><img src="./images/projects/coglet/pca9685.jpg" alt="PCA9685 16 路舵机驱动板，带几排三针舵机接口和一个接线端子" loading="lazy"><figcaption>PCA9685：16 路 12 位 PWM 舵机驱动板，通过 I²C 控制。产品图。</figcaption></figure>
</div>

MCU 只需通过 I²C 发出“通道 4 → 30°”这样的指令，舵机脉冲由 PCA9685 自己生成。

| 连接 | 说明 |
| --- | --- |
| I²C | XIAO 的 GPIO5 → SDA、GPIO6 → SCL。3V3 和 GND 接 PCA9685 的逻辑侧（地址 0x40）。视觉模块也挂在这两根线上。 |
| 舵机供电 | PCA9685 的接线端子上接独立的 5 V 电源。九个舵机同时动作时电流很大，远超 USB 供电的开发板能安全提供的范围。一旦电压跌落，MCU 就会复位。 |
| 舵机通道 | 0–2、4–6、8–10 |

<figure class="figure-media figure-medium">
<img src="./images/projects/coglet/breadboard-wiring.jpg" alt="实物：面包板上的 XIAO，以及接满舵机线的 PCA9685" loading="lazy">
<figcaption>实物接线：左边是面包板上的 XIAO，右边是接着舵机线的 PCA9685。</figcaption>
</figure>

</details>

<details>
<summary>ESP-Claw 框架</summary>

[ESP-Claw](https://github.com/espressif/esp-claw) 是乐鑫为自家芯片推出的开源 AI 智能体框架（Apache-2.0）。智能体能执行的动作由工具和 Lua 脚本定义。新行为可以写成 Lua 脚本加进来，不必重新烧录固件。可编辑的档案和长期记忆都存在设备本地。设备事件可以触发智能体，简单的规则不用调用 LLM 就能执行。

我的工作是让 ESP-Claw 成为*这台*机器人的大脑。它在 XIAO 上运行，配有控制 Coglet 身体的工具和配套界面。开发时用串口终端，其他人用机器人自带的网页聊天。两者连的是同一个智能体和同一套工具。

</details>

<details>
<summary>技术组件一览</summary>

| 组件 | 是什么 | 在本项目中的作用 |
| --- | --- | --- |
| **微控制器（MCU）** | 单芯片上的小型计算机，专门控制硬件，没有 PC 那样的操作系统 | 运行智能体、Wi-Fi、网页和电机控制 |
| **舵机** | 能转到指定角度并保持住的小电机 | 驱动 Coglet 的耳朵、眼睛、眼皮和头部 |
| **PWM 舵机驱动板** | 产生舵机所需精确脉冲的芯片 | PCA9685 最多可驱动 16 个舵机 |
| **I²C** | 由数据线和时钟线组成、多颗芯片共用的两线总线 | 连接 MCU、舵机驱动板和视觉模块 |
| **AI 智能体** | 由语言模型从一组工具中选择动作的程序 | 把“打个瞌睡”对应到正确的动作 |
| **工具 / 脚本** | 允许智能体调用的函数 | 用来读取硬件信息或播放动作的 Lua 脚本 |

</details>

## 实机结果

### 自然语言控制

对视频里的每句请求，智能体都自己选出对应技能，调用 Lua 脚本并回复确认。

<figure class="figure-media">
<video data-src="./images/projects/coglet/chat-control.mp4" muted loop playsinline preload="none" aria-label="在 ESP-Claw 网页聊天中输入消息，Coglet 随即做出相应动作：让它打瞌睡，它就变得困倦；让它帮忙找东西，它就醒来开始寻找"></video>
<figcaption>Coglet 按两句日常请求做出了动作。“你下班了，可以休息一下打打瞌睡” → Coglet 变得困倦。“别打瞌睡了，起来帮我找东西” → 它醒来开始寻找。视频加了英文字幕，1.25 倍速播放。</figcaption>
</figure>

### 示教录制的技能

示教器是机器人自带的一个网页。动作先手动摆好姿态，录成关键帧，再命名保存。Lua 脚本按名称回放任意技能或任务。

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/teach-pendant-skill.png" alt="示教器 Skill 页：各舵机通道的滑块，以及技能录制器和技能播放器" loading="lazy"><figcaption><strong>Skill</strong> 页：逐个调整舵机姿态，录制关键帧，保存并回放。</figcaption></figure>
<figure class="figure-media"><img src="./images/projects/coglet/teach-pendant-task.png" alt="示教器 Task 页：技能池、可上下调整顺序的任务链，以及任务播放器" loading="lazy"><figcaption><strong>Task</strong> 页：把已保存的技能串成更长的行为。</figcaption></figure>
</div>

<div class="figure-row">
<figure class="figure-media"><video data-src="./images/projects/coglet/skill-sleepy.mp4" muted loop playsinline preload="none" style="aspect-ratio: 9 / 16" aria-label="Coglet 慢慢垂下眼皮、耷拉耳朵：困倦技能"></video><figcaption><strong>困倦</strong>技能：眼皮下垂，耳朵耷拉。</figcaption></figure>
<figure class="figure-media"><video data-src="./images/projects/coglet/skill-search.mp4" muted loop playsinline preload="none" style="aspect-ratio: 9 / 16" aria-label="Coglet 睁大眼睛左右转头：寻找行为"></video><figcaption><strong>寻找</strong>行为：睁大眼睛，左右转头张望。</figcaption></figure>
</div>

<details>
<summary>录制流程</summary>

1. 用滑块或 ±5° 按钮逐个调整舵机通道，直到 Coglet 的姿态看起来合适。
2. 把当前姿态记为一个关键帧，重复几次就组成一个动作。
3. 保存为技能。关键帧、帧间隔（秒）以及循环还是单次播放，一起存成机器人上的 JSON 文件。
4. 把多个技能按顺序串成任务，比如*抬头 → 向右转*，同样保存下来。

</details>

### 硬件状态自报

智能体根据工具读到的实时数据回答关于自身的问题。日志里，它先载入记忆、技能和工具，再调用系统信息工具。在网页聊天里问同样的问题，也能得到同类回答。

<details>
<summary>终端会话日志</summary>

在终端里让机器人介绍自己（网络信息已隐去）：

```text
basic_demo> ask_once "你运行在什么设备上？这台设备有哪些能力？"
claw_core: context_loaded  provider=Editable Profile Memory
claw_core: context_loaded  provider=Long-term Memory
claw_core: context_loaded  provider=Skills List
claw_core: context_loaded  provider=cap Tools
claw_core: context_loaded  provider=Time Context
claw_core: tool_call       name=get_system_info
claw_core: tool_result     name=get_system_info  err=ESP_OK
claw_core: completion      status=done

assistant> 我当前运行在一台 ESP32-S3 设备上。

  设备     芯片 ESP32-S3 · 版本 rev 2 · 2 核 · 已运行约 1259 秒
  内存     PSRAM 约 6.49 MB（剩余 6.20 MB）· 内部 RAM 约 416 KB（剩余 194 KB）
  网络     Wi-Fi 已连接 · 信号 -51 dBm · WPA2/WPA3
  能力     双核处理 · Wi-Fi 与局域网通信 · 运行 Lua 脚本 · 后台异步任务
```

</details>

<div class="chat-log">
<div class="chat-msg chat-user">你好，介绍一下当前设备的功能和配置</div>
<div class="chat-msg chat-agent">你好，当前设备已经在线，下面是它的功能与配置概览。<br><br><strong>设备配置</strong>：ESP32-S3 · rev 2 · 双核 · 运行约 36 秒 · 当前任务数 19<br><strong>内存情况</strong>：内部 RAM 总量 416,683 B · 空闲 193,263 B</div>
</div>

### 画面与音频推流

机器人把摄像头和麦克风推流到局域网内任意浏览器，不用安装应用。音频面板带实时音量条。

<figure class="figure-media figure-medium">
<video data-src="./images/projects/coglet/camera-stream.mp4" muted loop playsinline preload="none" style="aspect-ratio: 900 / 1080" aria-label="浏览器页面显示 Coglet 转头时拍到的房间实时画面，下方是音频推流面板"></video>
<figcaption>浏览器里显示 Coglet 转头时的实时摄像头画面。下方是音频推流面板。人脸已打码。</figcaption>
</figure>

### 端侧视觉检测

检测在视觉模块上完成，视频不用离开机器人，也不占用 MCU。模块的 Himax WiseEye2 芯片内含 Arm Ethos-U55 神经网络处理器。经 I²C 传出的只有检测框、标签和置信度。智能体通过工具读取这些结果，所以能回答“你面前有人吗？”，也能在有人出现时做出反应。

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/grove-vision-ai-v2.jpg" alt="Grove Vision AI V2 板，带摄像头接口和 USB-C 接口" loading="lazy"><figcaption>Grove Vision AI V2。产品图。</figcaption></figure>
<figure class="figure-media"><video data-src="./images/projects/coglet/vision-face-detection.mp4" muted loop playsinline preload="none" style="aspect-ratio: 940 / 690" aria-label="视觉模块上运行的人脸检测：标有 face 和置信度的红色检测框跟随人脸移动，设备日志同时打印检测框"></video><figcaption>人脸检测直接在模块上运行。左侧是检测框和置信度。右侧是模块发出的原始结果。</figcaption></figure>
</div>

## 相关项目

- [VR 遥操作平台](#/projects/vr-teleoperation)：实时操控更大型的机器人
- 在此之前，我还在树莓派上跑过一个轻量版智能体 zero-Claw。
