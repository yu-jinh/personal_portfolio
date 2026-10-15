---
title: 为 Coglet 机器人打造的 ESP32 AI 智能体与控制模块
summary: 我复刻了开源机器人 Coglet 的硬件，并基于 ESP32-S3 和乐鑫的 ESP-Claw 框架为它打造了自己的 AI 智能体与控制模块，测试 LLM 智能体在小型嵌入式板卡上的能力。机器人能理解日常语言、触发录制好的动作、读取自身硬件信息、推送摄像头与音频，并通过板载 AI 视觉模块识别人。
role: 按开源设计复刻 Coglet 硬件，并在其上构建智能体与控制层：ESP32 与 I²C 舵机控制接线、将 ESP-Claw 移植到机器人、带技能 / 任务录制回放的示教器、让智能体调用动作的 Lua 桥接、网页摄像头与音频推流，以及视觉模块集成。
brief: 在微控制器上测试 LLM 智能体：ESP32-S3 通过录制好的动作技能驱动开源机器人 Coglet，用日常语言对话，并读取板载视觉模块的结果。
facts: 9 个舵机 :: 由 2 根 I²C 线驱动 || 约 21 ms :: 视觉模块单帧推理耗时 || 640 × 480 :: 浏览器摄像头推流，30 fps
---

## 速览

- **是什么**：一台小巧的桌面陪伴机器人，它的"大脑"是运行在邮票大小微控制器上的 AI 智能体
- **为什么**：探索在只有几百 KB 内存的低成本嵌入式硬件上，LLM 智能体能做到什么程度，以及怎样让它安全地在物理世界中行动
- **主要组成**：XIAO ESP32-S3 + PCA9685，两根 I²C 线 · ESP-Claw 智能体框架 · 示教器录制与回放动作 · 终端或网页聊天的自然语言控制 · 浏览器中的实时画面与音频 · 端侧人脸 / 人体检测

## 用通俗的话介绍技术组件

| 技术组件 | 是什么 | 在这里的作用 |
| --- | --- | --- |
| **微控制器（MCU）** | 集成在一颗芯片上的小型计算机，没有 PC 那样的操作系统，专为控制硬件设计 | XIAO ESP32-S3 运行智能体、Wi-Fi、网页和电机控制 |
| **舵机** | 能转到指定角度并保持的小电机 | 驱动 Coglet 的耳朵、眼睛、眼皮和头部 |
| **PWM 舵机驱动板** | 生成舵机所需精确脉冲信号的芯片 | PCA9685 最多驱动 16 个舵机，替 MCU 承担这部分工作 |
| **I²C** | 两根线（数据 + 时钟）组成的总线，一颗芯片可以和多颗芯片通信 | 连接 MCU、舵机驱动板和视觉模块 |
| **AI 智能体** | 由语言模型决定采取哪些动作、并使用一组工具的程序 | 把"打个瞌睡"变成对应的动作 |
| **工具 / 脚本** | 智能体被允许调用的函数 | 读取硬件信息或播放动作的 Lua 脚本 |

## 机器人本体：Coglet

[Coglet](https://www.kickstarter.com/projects/willcogley/coglet-open-source-3d-printable-robot-companion-kit) 是 Will Cogley 设计的开源、可 3D 打印的陪伴机器人套件。我按开源设计复刻了它的硬件：**9 个舵机**驱动耳朵、眼睛、眼皮和头部。下文介绍的内容都是我在这副身体之上自己构建的：AI 智能体、ESP32 控制模块、示教器、推流与视觉。

## 硬件与接线

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/xiao-esp32s3-sense.jpg" alt="Seeed XIAO ESP32-S3 Sense：拇指大小、带摄像头模组和 USB-C 接口的开发板" loading="lazy"><figcaption>XIAO ESP32-S3 Sense：双核 MCU，带 Wi-Fi、额外 PSRAM、摄像头和麦克风。产品图。</figcaption></figure>
<figure class="figure-media"><img src="./images/projects/coglet/pca9685.jpg" alt="PCA9685 16 路舵机驱动板，带多排三针舵机接口和接线端子" loading="lazy"><figcaption>PCA9685：16 路 12 位 PWM 舵机驱动板，通过 I²C 控制。产品图。</figcaption></figure>
</div>

**XIAO ESP32-S3 Sense** 是大脑：双核 ESP32-S3，带 Wi-Fi 和额外的 PSRAM 内存，扩展板上还有摄像头和麦克风。舵机接在 **PCA9685** 驱动板上：MCU 只需通过 I²C 发送"通道 4 → 30°"，舵机脉冲由 PCA9685 自己生成，MCU 的算力就留给了智能体。

<figure class="figure-media">
<a href="./images/projects/coglet/wiring.svg" target="_blank" rel="noreferrer"><img src="./images/projects/coglet/wiring.svg" alt="接线图：XIAO ESP32-S3 的 3V3、GND、GPIO5、GPIO6 分别接 PCA9685 的 VCC、GND、SDA、SCL；Grove Vision AI V2 共用 SDA 和 SCL；独立的 5 V 电源经 PCA9685 接线端子为舵机供电；9 个舵机接在通道 0-2、4-6、8-10" loading="lazy"></a>
<figcaption>两根 I²C 线（SDA 接 GPIO5，SCL 接 GPIO6）承载全部控制数据；舵机使用独立的 5 V 电源，只与开发板共地。</figcaption>
</figure>

- **I²C**：XIAO **GPIO5 → SDA**、**GPIO6 → SCL**，3V3 和 GND 接 PCA9685 的逻辑电源（地址 0x40）。视觉模块挂在同两根线上。
- **舵机供电**：PCA9685 接线端子接独立的 **5 V 电源**。九个舵机同时运动的电流远超 USB 供电的开发板所能安全提供的，电压跌落会导致 MCU 重启。
- **舵机**：接在通道 **0–2、4–6、8–10**。

<figure class="figure-media figure-medium">
<img src="./images/projects/coglet/breadboard-wiring.jpg" alt="实物：面包板上的 XIAO 与连着大量舵机线的 PCA9685" loading="lazy">
<figcaption>实物接线：面包板上的 XIAO（左），以及连着舵机线的 PCA9685（右）。</figcaption>
</figure>

## 智能体框架：ESP-Claw

[ESP-Claw](https://github.com/espressif/esp-claw) 是乐鑫为自家芯片推出的开源 AI 智能体框架（Apache-2.0），用 C 语言实现，**感知 → 决策 → 执行**的智能体循环直接运行在设备上。需要推理时，它通过 Wi-Fi 调用支持工具调用的云端 LLM，其余一切都留在芯片上：

- **工具与 Lua 脚本**：智能体可以执行的动作，新行为可以用 Lua 脚本添加，无需重新烧录固件。
- **记忆**：可编辑的档案与长期记忆，保存在设备本地。
- **事件**：设备事件可以触发智能体，简单规则无需调用 LLM 即可执行。

我的工作是让 ESP-Claw 成为*这台*机器人的大脑：让它在 XIAO 上运行，为它提供操控 Coglet 身体的工具，并围绕它搭建交互界面。

## 示教器：录制动作，按名称回放

让 LLM 实时设置九个舵机的角度，既慢、又不可靠、还昂贵。所以我做了一个**示教器**：一个由机器人自身提供的网页，可以手动录制动作并命名保存。智能体的工作就变得很简单：选对动作。

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/teach-pendant-skill.png" alt="示教器 Skill 页：各舵机通道的滑块，以及技能录制器和技能播放器" loading="lazy"><figcaption><strong>Skill</strong> 页：调整各舵机姿态、录制关键帧、保存并回放。</figcaption></figure>
<figure class="figure-media"><img src="./images/projects/coglet/teach-pendant-task.png" alt="示教器 Task 页：技能池、可上下调整顺序的任务链和任务播放器" loading="lazy"><figcaption><strong>Task</strong> 页：把已保存的技能串成更长的行为。</figcaption></figure>
</div>

1. **摆姿态**：用滑块或 ±5° 按钮调整每个舵机通道，直到 Coglet 的样子满意。
2. **录制**：把当前姿态记录为一个关键帧，重复多次组成一个动作。
3. **保存为技能**：关键帧、帧间隔（秒）以及循环 / 单次播放，以 JSON 文件保存在机器人上。
4. **组合成任务**：把技能按顺序组合，例如*抬头 → 向右转*，同样保存下来。

智能体通过一个 **Lua 脚本**调用这些动作：传入技能或任务名称，脚本就在舵机上播放。LLM 从不直接处理舵机角度，只从一份命名好、测试过的动作菜单里做选择。

<div class="figure-row">
<figure class="figure-media"><video data-src="./images/projects/coglet/skill-sleepy.mp4" muted loop playsinline preload="none" style="aspect-ratio: 9 / 16" aria-label="Coglet 慢慢垂下眼皮、耷拉耳朵：困倦技能"></video><figcaption><strong>困倦</strong>技能：眼皮下垂、耳朵耷拉。</figcaption></figure>
<figure class="figure-media"><video data-src="./images/projects/coglet/skill-search.mp4" muted loop playsinline preload="none" style="aspect-ratio: 9 / 16" aria-label="Coglet 睁大眼睛左右转头：寻找行为"></video><figcaption><strong>寻找</strong>行为：睁大眼睛，左右转头张望。</figcaption></figure>
</div>

## 与智能体交互：终端与网页

智能体有两个入口：开发用的**串口终端**，以及机器人提供的**网页聊天**。两者连接的是同一个智能体和同一套工具。

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

日志展示了智能体循环的过程：先把记忆、技能列表和工具加载进上下文，再决定调用 `get_system_info`，最后依据**真实读数**作答：芯片版本、剩余内存、信号强度，没有一项是猜测。

同样的问题也可以在网页聊天中提出：

<div class="chat-log">
<div class="chat-msg chat-user">你好，介绍一下当前设备的功能和配置</div>
<div class="chat-msg chat-agent">你好，当前设备已经在线，下面是它的功能与配置概览。<br><br><strong>设备配置</strong>：ESP32-S3 · rev 2 · 双核 · 运行约 36 秒 · 当前任务数 19<br><strong>内存情况</strong>：内部 RAM 总量 416,683 B · 空闲 193,263 B</div>
</div>

## 自然语言控制

各部分在这里汇合。我在网页聊天里输入一句日常的话，智能体理解意图、选出对应动作、调用 Lua 脚本，并用文字确认：

<figure class="figure-media">
<video data-src="./images/projects/coglet/chat-control.mp4" muted loop playsinline preload="none" aria-label="在 ESP-Claw 网页聊天中输入消息，Coglet 随之执行：叫它打瞌睡就变得困倦，叫它帮忙找东西就醒来开始寻找"></video>
<figcaption>"你下班了，可以休息一下打打瞌睡" → Coglet 变得困倦；"别打瞌睡了，起来帮我找东西" → 它醒来开始寻找。视频中加了英文字幕。1.25 倍速。</figcaption>
</figure>

两句话都没有提到动作名称。智能体自己把"打瞌睡"对应到*困倦*技能，把"帮我找东西"对应到*寻找*，而填补人的说话方式与机器人固定动作列表之间的鸿沟，正是 LLM 擅长的事。

## 赋予它视觉

### 浏览器中的实时画面与音频

XIAO 自带的摄像头和麦克风直接推流到机器人提供的网页上：**640×480、30 fps 的 MJPEG 视频**，以及板载麦克风的 **16 kHz PCM 音频**和实时音量指示。局域网内的任何人都能看到、听到 Coglet 的状态，无需安装应用。

<figure class="figure-media figure-medium">
<video data-src="./images/projects/coglet/camera-stream.mp4" muted loop playsinline preload="none" style="aspect-ratio: 900 / 1080" aria-label="浏览器页面中 Coglet 转头时的实时摄像头画面，下方是音频推流面板"></video>
<figcaption>Coglet 转头时浏览器中的实时摄像头画面，下方为音频推流面板。人脸已打码。</figcaption>
</figure>

### 端侧视觉：Grove Vision AI V2

把视频推给人看很有用，让机器人自己*看懂*则更好。**Grove Vision AI V2** 模块搭载 Himax WiseEye2 芯片和 Arm **Ethos-U55 神经网络处理器**，**本地运行检测模型，每帧约 21 ms**，只通过同一条 I²C 总线发送结果（框、标签、置信度），视频完全不需要离开机器人。

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/grove-vision-ai-v2.jpg" alt="带摄像头接口和 USB-C 的 Grove Vision AI V2 板" loading="lazy"><figcaption>Grove Vision AI V2。产品图。</figcaption></figure>
<figure class="figure-media"><video data-src="./images/projects/coglet/vision-face-detection.mp4" muted loop playsinline preload="none" style="aspect-ratio: 940 / 690" aria-label="视觉模块上运行的人脸检测：带置信度的红框跟随人脸，设备日志打印检测框"></video><figcaption>模块上的人脸检测：检测框与置信度（左），以及它发出的原始结果（右）。</figcaption></figure>
</div>

检测结果以**工具**的形式提供给智能体，它可以回答"你面前有人吗？"，或者在有人出现时做出反应。这是关于外部世界的高层信息，可直接用于后续行为，代价只是共享总线上的几个字节。

## 收获

- **微控制器也能承载有用的智能体**：有了 PSRAM，ESP32-S3 能同时运行智能体循环、记忆、网页服务、摄像头推流和电机控制。重度推理交给云端 LLM，其余都在本地。
- **给 LLM 菜单，而不是电机**：命名、录制好的技能让行为可靠又安全。模型擅长选择正确的动作，却不擅长生成平滑的舵机轨迹。
- **把感知放在边缘**：只发送结果而非视频的专用视觉芯片，既释放了 MCU，也保护了隐私。

## 相关项目

- [VR 遥操作平台](#/projects/vr-teleoperation)：实时操控更大的机器人
- 此前我也在树莓派上运行过轻量版智能体 zero-Claw。
