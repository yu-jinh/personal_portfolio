---
title: Unity 如何用 Gradle 打出 Quest APK
summary: 一篇学习笔记：跟着一个 Unity Quest 应用，从点击 Build 一路走到签好名的 APK，讲清 Unity 做了什么、Gradle 做了什么，以及 APK 里每个文件从哪来。
role: 升级 Quest 遥操作应用的 Android 构建时做的自学笔记。每条结论都对照过 Unity、Android 和 Gradle 的官方文档，以及工程生成的文件、构建日志和 release APK。
brief: Unity 的 Gradle 模板各管什么，C#（经 IL2CPP）、Java 库和 C++ 胶水代码又如何汇入一个 154.6 MB 的 Quest APK。
---

## 概要

Unity 的 Android 构建分为两半。前一半由 Unity 完成：把全部 C# 编成一个原生库 `libil2cpp.so`，再写出一份完整的 Gradle 工程。后一半由 Gradle 完成：在 Android Gradle Plugin（AGP）的驱动下，把这份工程打成 APK。

本文的例子是一个 Meta Quest 应用，用 Unity 6000.6.6f1、Gradle 9.3.1 和 AGP 9.1.1 构建。它的 release APK 有 154.6 MB，里面有 26 个原生库、一个 dex 文件和 Unity 的游戏数据。文中所有数字都取自这次构建。

Gradle 工程每次打包都会重新生成。所以长期有效的修改，要么写进 `Assets/Plugins/Android` 下的模板，要么写成构建回调，不能直接改生成目录。

这套模型也能解释工程从 Unity 6000.0 升级到 6000.6 时遇到的两次失败。一次发生在 Gradle 配置构建的阶段，另一次发生在原生编译任务执行时。

## 一页读懂 Gradle

Gradle 通过运行任务来构建软件。任务是一个工作单元，比如编译 Java、打包 APK。任务之间有依赖，Gradle 按依赖顺序执行。

| 术语 | 在这次构建中的含义 |
| --- | --- |
| 项目（模块） | 带有自己 `build.gradle` 的目录：`launcher`、`unityLibrary` 和 `xrmanifest.androidlib` |
| 插件 | 给项目添加任务和配置的代码。AGP 就是懂得如何构建 Android 应用的插件 |
| 依赖 | 模块需要的库，写作 `implementation …` |
| 仓库 | Gradle 下载插件和库的服务器或目录 |
| 任务 | 一个工作单元。`assembleRelease` 负责产出 release APK |

每次 Gradle 构建都分三个阶段。初始化阶段读取 `settings.gradle`，确定哪些项目参与构建。配置阶段执行所有 `build.gradle`，建立任务图。执行阶段运行目标任务及其依赖的任务。

构建失败时，阶段很关键。配置阶段出错，说明构建脚本本身有问题。执行阶段出错，说明某个任务（比如编译器）处理输入时失败了。

## 从编辑器到 APK

<figure class="figure-media"><img src="./images/projects/unity-gradle/build-pipeline.zh.svg" alt="构建流程：Unity 编辑器调用 BuildPlayer；C# 编译成 IL 并裁剪；IL2CPP 把 IL 转成 C++ 并编出 libil2cpp.so；Unity 按模板写出 Gradle 工程并执行回调；Gradle 9.3.1 与 AGP 9.1.1 执行 assembleRelease，先把 unityLibrary 编成 AAR，再把 launcher 打成 APK" width="760" height="748" loading="lazy"><figcaption>Gradle 启动之前，所有 C# 已经是机器码；Gradle 只编译 Java 和两个小型 C++ 库。左列从上往下读，右侧注释补充每一步发生在哪里、怎么发生。橙色框内先构建库模块，因为应用模块依赖它。依据工程的构建日志和生成文件绘制。</figcaption></figure>

构建从工程 Build 菜单调用的 `BuildPipeline.BuildPlayer` 开始。Unity 先把脚本编译成 IL 程序集，UnityLinker 再删掉没有被引用的代码。随后 IL2CPP 把剩下的 IL 转成 C++，由 NDK 里的 clang 编译成 `libil2cpp.so`。

接着 Unity 填写 Gradle 模板，把原生库和游戏数据拷进工程。各个包的构建回调在这时执行；本工程有十二个回调会修改 Android 清单。最后 Unity 在 `launcher` 目录里启动自带的 Gradle，执行 `assembleRelease` 任务。

成功的那次构建共有 81 个 Gradle 任务，用时 34 秒：27 个实际执行，54 个已是最新。Unity 统计整个“Building Gradle project”步骤用了 49.4 秒。

<details>
<summary>部分 Gradle 任务（按执行顺序）</summary>

| 任务 | 作用 |
| --- | --- |
| `:launcher:processReleaseManifest` | 把所有清单合并成一份 |
| `:launcher:dexBuilderRelease`、`mergeDexRelease` | D8 把 Java 字节码转成 dex 并合并 |
| `:unityLibrary:configureCMakeRelWithDebInfo[arm64-v8a]` | 为 C++ 胶水代码运行 CMake 配置 |
| `:unityLibrary:buildCMakeRelWithDebInfo[arm64-v8a]` | 编译 `libgame.so` 和 `libswappywrapper.so` |
| `:launcher:mergeReleaseNativeLibs` | 汇总各模块和 AAR 里的全部 `.so` |
| `:launcher:stripReleaseDebugSymbols` | 剥离调试符号，命中保留规则的除外 |
| `:launcher:packageRelease` | 写出 APK 并签名 |
| `:launcher:assembleRelease` | 目标任务；APK 生成后即完成 |

Unity 用 `java -classpath gradle-launcher-9.3.1.jar org.gradle.launcher.GradleMain assembleRelease` 启动 Gradle，不经过 `gradlew` 脚本。

</details>

## 生成的工程

Unity 把 Gradle 工程写到 `Library/Bee/Android/Prj/IL2CPP/Gradle/`。这是内部路径，每次打包都会被覆盖。在 Build Profiles › Android 里选 Export Project，可以导出结构相同、能在 Android Studio 中编辑的工程。

```text
Gradle/
├── settings.gradle            ← settingsTemplate.gradle
├── build.gradle               ← baseProjectTemplate.gradle（本工程用 Unity 默认）
├── gradle.properties          ← gradleTemplate.properties
├── local.properties           sdk.dir，指向 Unity 自带的 Android SDK
├── shared/                    common.gradle、keepUnitySymbols.gradle
├── launcher/
│   ├── build.gradle           ← launcherTemplate.gradle
│   ├── setupSymbols.gradle
│   └── src/main/              AndroidManifest.xml、res/（图标、应用名）
└── unityLibrary/
    ├── build.gradle           ← mainTemplate.gradle
    ├── proguard-unity.txt     Unity Java 类的保留规则
    ├── libs/                  AAR 和 JAR，包括 unity-classes.jar
    ├── xrmanifest.androidlib/ XR 加载器的清单模块
    └── src/main/
        ├── AndroidManifest.xml
        ├── assets/bin/Data/   场景、资源、Managed/Metadata/global-metadata.dat
        ├── cpp/               GameActivity/ 和 FramePacing/ 的 C++ 与 CMake 文件
        ├── java/              UnityPlayerGameActivity.java 和工程的 Java 插件
        └── jniLibs/arm64-v8a/ libil2cpp.so、libunity.so、libmain.so 及插件 .so
```

自定义模板在 Player Settings › Publishing Settings › Build 里勾选启用。勾选后，Unity 会在 `Assets/Plugins/Android/` 下生成对应文件。本工程自定义了 settings、launcher、main 和 properties 四个模板，根目录 `build.gradle` 沿用 Unity 默认。

| 模板 | 生成的文件 | 负责的内容 |
| --- | --- | --- |
| `settingsTemplate.gradle` | `settings.gradle` | 有哪些模块；插件和库各从哪里下载 |
| `baseProjectTemplate.gradle` | `build.gradle` | AGP 版本，为所有模块统一声明 |
| `launcherTemplate.gradle` | `launcher/build.gradle` | 可安装的应用：ID、版本、打包、签名 |
| `mainTemplate.gradle` | `unityLibrary/build.gradle` | Unity 玩家库：依赖和原生 CMake 构建 |
| `gradleTemplate.properties` | `gradle.properties` | Gradle 进程和 AGP 的设置 |

模板里有 `**MINSDK**`、`**TARGETSDK**`、`**DEPS**` 这类占位符。Unity 会用 Player Settings 或构建过程中的值替换它们。`**APIVERSION**` 等于目标 SDK，用来填 `compileSdk`。Unity 会替换文件中任何位置的占位符，所以在注释里写一个 `**DEPS**`，也会把模板改坏。

每个模板还带一个格式版本号 `unityTemplateVersion`。Unity 6000.0.37 中是 18，6000.6.6 中是 26。自定义模板的版本比 Unity 期望的旧时，Unity 会报错。

模板不是唯一的扩展方式。包和编辑器脚本还可以实现 `IPostGenerateGradleAndroidProject`，或使用 `AndroidProjectFilesModifier`，在 Gradle 运行前修改生成的工程。

## 插件与库

<figure class="figure-media"><img src="./images/projects/unity-gradle/plugins-vs-libraries.zh.svg" alt="两条通道：插件从 pluginManagement 仓库解析，以 Android Gradle Plugin 的形式在打包电脑上运行；库从 dependencyResolutionManagement 仓库解析，被打进 APK，在 Quest 上运行" width="760" height="432" loading="lazy"><figcaption>插件和库来自两份不同的仓库列表，最终也在不同的地方运行。灰色通道在打包电脑上，橙色通道最终到头显上。虚线箭头表示插件把库打进 APK。仓库列表取自工程的 settingsTemplate.gradle。</figcaption></figure>

插件在打包电脑上运行，不会进入 APK。这里的插件就是 AGP 9.1.1，它提供 `android { }` 配置块，以及编译、转 dex、合并和签名等任务。库则是打进 APK、在 Quest 上运行的代码。

Gradle 从 `settings.gradle` 里两份独立的列表解析它们。`pluginManagement.repositories` 只找插件，`dependencyResolutionManagement.repositories` 只找库。两份列表互不共用。

`google()` 两边都写，是因为 Google 的 Maven 仓库既发布 AGP 本身，也发布 AndroidX 库。根目录 `build.gradle` 申明了 `id 'com.android.application' version '9.1.1'`。Gradle 通过 Google 仓库上的插件标记构件找到它。

`flatDir` 只出现在库的列表里。它按文件名在 `unityLibrary/libs` 里查找 `OVRPlugin.aar` 这类文件。flatDir 里的文件没有元数据，Gradle 无法得知这个 AAR 自己还依赖什么。这些依赖只能手动声明，所以 `mainTemplate.gradle` 里显式列出了 `kotlin-stdlib` 和 AndroidX 库。

依赖有两种写法。`'androidx.appcompat:appcompat:1.6.1'` 这样的字符串，用组名、名称和版本指定一个 Maven 构件。`(name: 'OVRPlugin', ext: 'aar')` 这样的映射写法，指定的是 flatDir 里的文件。Gradle 9.1 已将映射写法标为弃用，Gradle 10 将不再接受。

`RepositoriesMode.PREFER_SETTINGS` 让 settings 里的列表成为唯一有效的一份。模块里声明的仓库会被忽略，并打印警告。本工程的旧模板还在 `buildscript` 和 `allprojects` 块里声明仓库。因此出现了六条警告，例如 “repository 'Google' was added by build file 'unityLibrary\build.gradle'”。

<details>
<summary>仓库模式</summary>

| 模式 | 模块自己声明了仓库时 |
| --- | --- |
| `PREFER_PROJECT`（默认） | 该模块只用自己的列表，settings 里的列表对它无效 |
| `PREFER_SETTINGS` | 模块的列表被忽略，并打印警告 |
| `FAIL_ON_PROJECT_REPOS` | 构建直接失败 |

</details>

## 两个模块

<figure class="figure-media"><img src="./images/projects/unity-gradle/modules.zh.svg" alt="模块关系图：launcher 依赖 unityLibrary；unityLibrary 依赖 xrmanifest.androidlib、本地 AAR 和 Maven 库，并用 CMake 和 games-activity 的 prefab 头文件编出 libgame.so 与 libswappywrapper.so" width="760" height="524" loading="lazy"><figcaption>应用模块只是一层薄壳，整个播放器都在它依赖的那个库模块里。箭头从模块指向它依赖的对象。虚线表示 CMake 从 games-activity 和 games-frame-pacing 的 AAR 中取用的头文件和静态库。版本号取自工程的 mainTemplate.gradle。</figcaption></figure>

`launcher` 应用 `com.android.application` 插件，所以产出可安装的 APK。凡是在设备上标识这个应用的设置都归它管：应用 ID、版本、SDK 版本、图标和签名。它只有一个依赖：`implementation project(':unityLibrary')`。

`unityLibrary` 应用 `com.android.library` 插件，产出 AAR。播放器、游戏数据、Java 插件和原生构建都在这里。正因为它是库，其他 Android 应用可以把它嵌进去，Unity 称之为 Unity as a Library。

`implementation` 把依赖放进本模块的编译和运行类路径。依赖本模块的其他模块运行时能拿到它，但不能针对它编译。换成 `api`，编译时也会暴露出去。

三个 SDK 版本号分工不同。`compileSdk`（34）决定代码能调用哪些 Android API。`minSdk`（32，即 Android 12L）是能安装应用的最低系统版本。`targetSdk`（34）决定应用采用哪一版的系统行为。Meta 要求新建的商店应用把 `targetSdk` 设为 34。

两种构建类型都是 `minifyEnabled false`，所以由 D8 把 Java 字节码转成 dex。打开代码压缩后，R8 会取代 D8，并额外做压缩、优化和混淆。那时 `proguard-unity.txt` 里的 Unity 保留规则，会保护原生代码按名字访问的类。

两种构建类型还都用 Android 的 debug 证书签名。release APK 上是这把证书生成的 APK 签名方案 v2 签名。要上架商店，必须在 Publishing Settings 里配置工程自己的 keystore，因为 Meta 要求使用唯一的签名密钥。

<details>
<summary>launcher 的字段与本次构建的取值</summary>

| 字段 | 取值 | 含义 |
| --- | --- | --- |
| `compileSdk` | 34 | 编译时可用的 Android API |
| `minSdk` | 32 | 能安装应用的最低系统版本（12L） |
| `targetSdk` | 34 | 应用采用的系统行为版本 |
| `buildToolsVersion` | 36.0.0 | aapt2 和打包工具 |
| `ndkVersion` | 27.2.12479018 | Unity 自带的 C/C++ 工具链 |
| `abiFilters` | `arm64-v8a` | 只打包 64 位 ARM 的库 |
| `versionCode` / `versionName` | 301 / 0.3.1 | 由工程的构建脚本设置 |
| `debugSymbolLevel` | `none` | 不另外生成原生符号文件 |
| Java 兼容版本 | 17 | 源码和字节码级别；Gradle 运行在 Unity 自带的 JDK 17 上 |

</details>

<details>
<summary>unityLibrary 的依赖</summary>

| 依赖 | 来源 | 作用 |
| --- | --- | --- |
| `OVRPlugin`、`InteractionSdk` | 本地 AAR | Meta XR 运行时和 Interaction SDK |
| `sherpa_onnx-release` | 本地 AAR | ONNX Runtime 和 JNI，用于端侧语音合成 |
| `data-channel-android-release` | 本地 AAR | 工程自己的 WebRTC DataChannel 库 |
| `unityopus`、`espeak_bridge-release` | 本地 AAR | 语音 SDK 用的 Opus 编解码；eSpeak 语音桥接 |
| `xrmanifest.androidlib` | 工程内模块 | XR 加载器的清单条目 |
| `kotlin-stdlib:2.2.20` | Maven | 预编译 AAR 需要的 Kotlin 运行时 |
| `appcompat`、`core`、`constraintlayout` | Maven | GameActivity 需要的 AndroidX 库 |
| `games-activity:4.4.0`、`games-frame-pacing:2.1.2` | Maven | 供 CMake 构建使用的头文件和静态库 |
| `fileTree(dir: 'libs', include: ['*.jar'])` | 本地 JAR | `unity-classes.jar`、语音 SDK 的 JAR 等 |

`libs/` 里的 AAR 只有声明过才会被打包。目录里有两个 AAR 没有声明，其中包括 62.5 MB 的 `libwebrtc.aar`，它们不会进入 APK。

</details>

## 清单合并

一个 APK 只有一份 `AndroidManifest.xml`。AGP 把多个来源合并成这一份，应用模块的优先级高于库。

launcher 的清单提供图标、应用名和屏幕支持。库模块的清单以 `Assets/Plugins/Android/AndroidManifest.xml` 为起点。Unity 再加上权限、Activity 属性和自己的元数据，例如 `extractNativeLibs="true"`。`xrmanifest.androidlib` 模块和每个 AAR 也会加入各自的条目。

Gradle 运行之前，Meta XR SDK、OpenXR 和 XR Management 等包的十二个 `IPostGenerateGradleAndroidProject` 回调会修改这些文件。两个来源设置了同一个值时，由 `tools:replace` 这类规则决定谁生效。本工程就对 `com.oculus.supportedDevices` 用了一条。

合并结果把 `com.unity3d.player.UnityPlayerGameActivity` 声明为启动 Activity。它的 intent filter 带有 `com.oculus.intent.category.VR`，表示这是一个 Quest 上的沉浸式应用。

## 原生库

原生库通过三条路径进入 APK。Unity 把自己的库和插件的库放进 `unityLibrary/src/main/jniLibs`。AAR 把库带在自己的 `jni/` 目录里。其余的由 CMake 在 Gradle 构建中编译出来。

| 库 | 大小 | 路径 | 内容 |
| --- | --- | --- | --- |
| `libsherpa-onnx-jni.so` | 119.2 MB | AAR | 语音模型运行时和 JNI |
| `libil2cpp.so` | 101.6 MB | jniLibs（IL2CPP） | 工程及各包的全部运行时 C# |
| `libopencvforunity.so` | 32.3 MB | jniLibs（插件） | OpenCV for Unity |
| `libunity.so` | 24.2 MB | jniLibs（预编译） | Unity 引擎 |
| `libonnxruntime.so` | 19.3 MB | AAR | ONNX Runtime |
| `liblivekit_ffi.so` | 18.3 MB | jniLibs（包） | LiveKit 客户端核心 |
| `libOVRPlugin.so` | 7.0 MB | AAR | Meta XR 运行时 |
| `libswappywrapper.so` | 4.7 MB | CMake | Unity 对 Swappy 帧节奏库的封装 |
| `libc++_shared.so` | 1.8 MB | CMake | NDK 的 C++ 标准库 |
| `libgame.so` | 1.4 MB | CMake | Unity 的 GameActivity 桥接层 |
| `libmain.so` | 6.7 KB | jniLibs（预编译） | Unity 的加载器 |

表中是解压后的大小，列出了 26 个库中的 11 个。

`libil2cpp.so` 只包含编译后的代码。类型名、方法名和字符串常量放在 `assets/bin/Data/Managed/Metadata/global-metadata.dat` 里，这次构建中有 22.6 MB。编辑器脚本永远不会编进玩家包。

应用通过 GameActivity 启动，入口在 Player Settings › Application Entry Point 中选择。`UnityPlayerGameActivity` 继承 `GameActivity`，并加载 `libgame.so`。这个桥接库负责把生命周期和输入事件转交给引擎。`libmain.so` 是 Unity 的加载器代码，由它加载 `libunity.so` 和 `libil2cpp.so`。

`libgame.so` 要在 Gradle 构建中编译，是因为它的桥接源码随工程一起提供。games-activity 的 AAR 以 prefab 格式提供头文件和静态库。`prefab true` 让 CMake 能用 `find_package(game-activity REQUIRED CONFIG)` 找到它们。这里的 prefab 是一种 AAR 打包格式，和 Unity 的预制体无关。

Unity 还给这次 CMake 构建传入 `-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON`。这个参数让库按 16 KB 内存页对齐，以支持 Android 15 引入的 16 KB 页设备。它只影响这次 CMake 编出的库，不影响预编译库。

`libswappywrapper.so` 之所以存在，是因为工程开启了 Optimized Frame Pacing。Swappy 负责普通手机屏幕的帧节奏。按 Unity 文档的说法，在头显上由 XR SDK 控制帧率。

## APK 里有什么

<figure class="figure-media"><img src="./images/projects/unity-gradle/apk-anatomy.zh.svg" alt="APK 内容条形图：原生库解压后 361.5 MB，APK 内 112.9 MB；assets 解压后 103.9 MB，APK 内 33.5 MB；classes.dex 7.5 MB，原样存放；清单与资源 0.6 MB 和 0.5 MB" width="760" height="398" loading="lazy"><figcaption>原生库占了 154.6 MB APK 的 73%，而且是压缩存放的。每一行对比一部分内容解压后的大小（灰色）和在 APK 里的大小（橙色）。右列是头显上读取它的组件。数据取自工程 release APK 中各 zip 条目的大小。</figcaption></figure>

APK 是一个目录结构固定的 zip 文件。`lib/arm64-v8a/` 放原生库。`assets/` 放应用自己读取的文件，这里是 Unity 的游戏数据。`classes.dex` 装着全部 Java 和 Kotlin 代码，这里只有一个 7.5 MB 的文件。`AndroidManifest.xml` 和 `resources.arsc` 向系统描述这个应用。

26 个 `.so` 全部压缩存放，因为 launcher 设置了 `useLegacyPackaging = true`。安装器会把它们解压到磁盘，再由动态链接器从那里加载。AGP 的默认做法是不压缩、按页对齐，让库直接从 APK 中加载。压缩能让 APK 文件更小，但安装后会多占存储。

有些文件必须保持不压缩。Unity 的 `noCompress` 列表让 `.unity3d`、`.ress`、`.resource`、`.obb`、`.bundle` 和 `.unityexp` 文件原样存放，再加上 StreamingAssets 的类型，这里是 `.json`。这样 Unity 可以直接从 APK 中读取。dex 文件和 `resources.arsc` 也不压缩。

`abiFilters 'arm64-v8a'` 让 `lib/` 里只保留 64 位 ARM 的库，这也是 Meta 的要求。但它管不到 `assets/`。OVRPlugin 的 AAR 在 assets 里同时放了两种 ARM 架构的辅助库，所以 32 位的副本仍然出现在那里。

## 调试符号

头显上的崩溃报告只有原始地址。调试符号能把这些地址还原成函数名和源码行号。符号很大，所以 release 构建通常会从发布的库中剥离它们，另存为单独的文件。

Unity 在 Gradle 运行前，已经剥离了自己的三个库。`libil2cpp.so` 的完整调试版本放在 `Library/Bee` 下，有 968.7 MB；随包发布的版本是 101.6 MB。`libunity.so` 也以同样方式从 34.6 MB 降到 24.2 MB。

Gradle 的 `stripReleaseDebugSymbols` 任务本应剥离其余所有库。库只要匹配某条 `keepDebugSymbols` 规则，就会被跳过。launcher 模板加了 `'*/arm64-v8a/*.so'`，这条规则匹配 APK 里的每一个库。结果 `libgame.so` 和 `libswappywrapper.so` 带着完整的调试段一起发布了。

Unity 的脚本在 release 构建时会打印“symbols will be stripped”。这句话只表示脚本自己没有加保留规则。模板里那条范围更大的规则依然生效。

| Debug Symbols 设置 | `debugSymbolLevel` | 符号文件内容 |
| --- | --- | --- |
| Disabled | `none` | 不生成符号文件 |
| Public | `symbol_table` | 函数名和地址（`.sym`） |
| Debugging | `full` | 函数名、源文件和行号（`.dbg`） |

这个设置在 Android 的构建配置（Build Profile）里。打 APK 时，AGP 把符号写进 `build/outputs/native-debug-symbols/` 下的 `native-debug-symbols.zip`。Unity 的 `setupSymbols.gradle` 会把 IL2CPP 的符号补进这个文件。设为 `none` 时，脚本直接返回。

## Gradle 属性

`gradle.properties` 是给 Gradle 进程和 AGP 用的键值设置。它不声明插件，也不声明依赖。Unity 通过 `**ADDITIONAL_PROPERTIES**` 占位符追加自己的一段设置。

`org.gradle.jvmargs=-Xmx4096M` 设置的是打包电脑上 Gradle 进程的堆上限，和头显上应用的内存无关。`org.gradle.parallel=true` 允许互不依赖的模块同时构建；`launcher` 仍要等 `unityLibrary` 完成。

`android.enableJetifier=true` 会把旧 Support Library 的字节码改写成 AndroidX。这一行由 Unity 写入，而 AGP 9.1.1 会警告：该选项已弃用，将在 AGP 10 中移除。`android.builtInKotlin=false` 也收到同样的警告。它关闭了 AGP 9 默认启用的 Kotlin 编译，本工程本来就用不到。

工程的模板里还设置了 `android.enableAapt2Jemalloc=false` 和 `android.enableResourceShrinking=false`。AGP 9.1.1 不认识这两个选项，所以这两行没有任何作用。资源压缩要在构建类型里用 `shrinkResources true` 打开，而且必须同时开启代码压缩。

<details>
<summary>Unity 追加到 gradle.properties 的键</summary>

其中多数键与 `build.gradle` 里已写入的值重复。Unity 的辅助脚本会在 Gradle 运行时读取它们。

| 键 | 取值 | 读取方或对应字段 |
| --- | --- | --- |
| `unityTemplateVersion` | 26 | Unity 的模板版本检查 |
| `unity.debugSymbolLevel` | `none` | `setupSymbols.gradle` |
| `unity.installInBuildFolder` | `false` | `common.gradle`，仅为 `true` 时关闭测试任务 |
| `unity.minSdkVersion` / `targetSdkVersion` / `compileSdkVersion` | 32 / 34 / 34 | `minSdk`、`targetSdk`、`compileSdk` |
| `unity.agpVersion` | 9.1.1 | 根目录 `build.gradle` |
| `unity.androidNdkVersion` | 27.2.12479018 | `ndkVersion` |
| `unity.javaCompatibilityVersion` | `VERSION_17` | 两个模块的 Java 级别 |
| `android.r8.strictFullModeForKeepRules` | `false` | 放宽 R8 对保留规则的检查；未开代码压缩时不起作用 |
| `android.bundle.includeNativeDebugMetadata` | `false` | 不把原生调试数据放进 App Bundle |

</details>

## 升级 Unity 时的两次失败

工程从 Unity 6000.0.37 升级到了 6000.6.6，后者自带 Gradle 9.3.1 和 AGP 9.1.1。而旧的自定义 `mainTemplate.gradle` 仍然锁定 AGP 7.4.2，应用了 Kotlin 插件，并依赖 games-activity 3.0.5。

第一次构建在配置阶段失败。旧模板应用了 `kotlin-android`，Gradle 报出“Failed to apply plugin 'kotlin-android'”，以及 AGP 扩展内部的类型转换错误。AGP 9 自带 Kotlin 支持，并换了一套新的 DSL，旧的 Kotlin 插件挂不上去。何况工程里根本没有 Kotlin 源码。预编译的 AAR 只需要 Kotlin 运行时，于是插件换成了 `kotlin-stdlib:2.2.20` 这个库。

两个模块现在都排除了 `kotlin-stdlib-jdk7` 和 `kotlin-stdlib-jdk8`。从 Kotlin 1.8 起，它们的类已并入 `kotlin-stdlib`；旧 AAR 如果还引用它们，就会带来重复类。

第二次构建在执行阶段失败，出错的是 `buildCMakeRelWithDebInfo[arm64-v8a]` 任务。clang 报告 Unity 的 `UGAConfiguration.cpp` 中，`GameActivity_getLocaleLanguage` 和 `GameActivity_getLocaleCountry` 未声明。头文件来自 games-activity 3.0.5，这个版本还没有这两个函数。Unity 建议 6000.3 及以后的版本使用 games-activity 4.4.x。固定到 4.4.0 后，构建成功。

两次失败的根源相同：自定义模板里锁定的版本，不会随 Unity 升级自动更新。升级后把每个自定义模板和新版默认模板对比一遍，就能提前发现这类问题。

构建失败后，先看生成工程里的 `launcher/build/outputs/logs/unity-assembleRelease-build.log`。Unity 的 `Editor.log` 里有同样的输出，外加前后的 Unity 步骤。需要深入排查时，可以用 Export Project 在 Android Studio 中打开同一份构建。

## 相关项目

- [VR 遥操作平台](#/projects/vr-teleoperation)：这套构建产出的 Quest 应用
