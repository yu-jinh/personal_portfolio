---
title: How Unity Builds a Quest APK with Gradle
summary: A study note that follows one Unity Quest app from the Build button to a signed APK, explaining what Unity does, what Gradle does, and where every file in the APK comes from.
role: Independent study while upgrading the Android build of my Quest teleoperation app. I checked each statement against the Unity, Android and Gradle documentation and against the project's generated files, build logs and release APK.
brief: What Unity's Gradle templates control, and how C# (via IL2CPP), Java libraries and C++ glue code end up in one 154.6 MB Quest APK.
---

## Summary

A Unity Android build has two halves. Unity compiles all C# into one native library, `libil2cpp.so`, and writes a complete Gradle project. Gradle, driven by the Android Gradle Plugin (AGP), then turns that project into an APK.

The worked example is a Meta Quest app built with Unity 6000.6.6f1, Gradle 9.3.1 and AGP 9.1.1. Its release APK is 154.6 MB and holds 26 native libraries, one dex file and Unity's game data. Every number in this note was read from that build.

Unity regenerates the Gradle project on every build. Lasting changes therefore go into templates in `Assets/Plugins/Android` or into build callbacks, never into the generated folder.

The same model explains two failures from upgrading this project from Unity 6000.0 to 6000.6. One broke while Gradle was configuring the build; the other broke while a native compile task was running.

## Gradle in one page

Gradle builds software by running tasks. A task is one unit of work, such as compiling Java or packaging an APK. Tasks depend on each other, and Gradle runs them in dependency order.

| Term | Meaning in this build |
| --- | --- |
| Project (module) | A folder with its own `build.gradle`: `launcher`, `unityLibrary` and `xrmanifest.androidlib` |
| Plugin | Code that adds tasks and configuration to a project. AGP is the plugin that knows how to build Android apps |
| Dependency | A library a module needs, written as `implementation …` |
| Repository | A server or folder where Gradle downloads plugins and libraries |
| Task | A unit of work. `assembleRelease` builds the release APK |

Every Gradle build runs in three phases. Initialization reads `settings.gradle` and decides which projects take part. Configuration runs every `build.gradle` and builds the task graph. Execution runs the tasks that the requested task depends on.

The phases matter when a build fails. An error during configuration means a build script itself is wrong. An error during execution means one task, such as a compiler, failed on its inputs.

## From editor to APK

<figure class="figure-media"><img src="./images/projects/unity-gradle/build-pipeline.svg" alt="Build pipeline: Unity Editor BuildPlayer; C# compiled to IL and stripped; IL2CPP converts IL to C++ and compiles libil2cpp.so; Unity writes the Gradle project from templates and runs callbacks; Gradle 9.3.1 with AGP 9.1.1 runs assembleRelease, building unityLibrary into an AAR and launcher into the APK" width="760" height="748" loading="lazy"><figcaption>All C# is already machine code before Gradle starts; Gradle compiles only Java and two small C++ libraries. Read the left column from top to bottom; the notes on the right add where or how each step happens. Inside the orange box, the library module is built first because the app module depends on it. Drawn from the project's build log and generated files.</figcaption></figure>

The build starts when the project's Build menu calls `BuildPipeline.BuildPlayer`. Unity compiles the scripts to IL assemblies, and UnityLinker removes code nothing references. IL2CPP then converts the remaining IL to C++, and the NDK's clang compiles it into `libil2cpp.so`.

Unity next fills in the Gradle templates and copies the native libraries and game data into the project. Build callbacks from packages run at this point; in this project, twelve of them edit the Android manifest. Unity then starts its bundled Gradle in the `launcher` folder with the task `assembleRelease`.

The successful build ran 81 Gradle tasks in 34 s, 27 of them executed and 54 already up to date. Unity reported 49.4 s for its whole "Building Gradle project" step.

<details>
<summary>Selected Gradle tasks, in the order they ran</summary>

| Task | What it does |
| --- | --- |
| `:launcher:processReleaseManifest` | Merges all manifests into one |
| `:launcher:dexBuilderRelease`, `mergeDexRelease` | D8 converts Java bytecode to dex and merges it |
| `:unityLibrary:configureCMakeRelWithDebInfo[arm64-v8a]` | Runs CMake for the C++ glue code |
| `:unityLibrary:buildCMakeRelWithDebInfo[arm64-v8a]` | Compiles `libgame.so` and `libswappywrapper.so` |
| `:launcher:mergeReleaseNativeLibs` | Collects every `.so` from all modules and AARs |
| `:launcher:stripReleaseDebugSymbols` | Strips debug symbols unless a keep rule matches |
| `:launcher:packageRelease` | Writes and signs the APK |
| `:launcher:assembleRelease` | The requested task; finishes when the APK exists |

Unity runs Gradle with `java -classpath gradle-launcher-9.3.1.jar org.gradle.launcher.GradleMain assembleRelease`. It does not use a `gradlew` script.

</details>

## The generated project

Unity writes the Gradle project to `Library/Bee/Android/Prj/IL2CPP/Gradle/`. The path is internal and is overwritten on every build. Build Profiles › Android › Export Project produces the same structure as an editable project for Android Studio.

```text
Gradle/
├── settings.gradle            ← settingsTemplate.gradle
├── build.gradle               ← baseProjectTemplate.gradle (Unity default here)
├── gradle.properties          ← gradleTemplate.properties
├── local.properties           sdk.dir of the Android SDK bundled with Unity
├── shared/                    common.gradle, keepUnitySymbols.gradle
├── launcher/
│   ├── build.gradle           ← launcherTemplate.gradle
│   ├── setupSymbols.gradle
│   └── src/main/              AndroidManifest.xml, res/ (icons, app name)
└── unityLibrary/
    ├── build.gradle           ← mainTemplate.gradle
    ├── proguard-unity.txt     keep rules for Unity's Java classes
    ├── libs/                  AARs and JARs, including unity-classes.jar
    ├── xrmanifest.androidlib/ manifest module for the XR loader
    └── src/main/
        ├── AndroidManifest.xml
        ├── assets/bin/Data/   scenes, resources, Managed/Metadata/global-metadata.dat
        ├── cpp/               GameActivity/ and FramePacing/ C++ with CMake files
        ├── java/              UnityPlayerGameActivity.java and the project's Java plugins
        └── jniLibs/arm64-v8a/ libil2cpp.so, libunity.so, libmain.so, plug-in .so files
```

Custom templates are enabled with checkboxes under Player Settings › Publishing Settings › Build. Unity then creates the file in `Assets/Plugins/Android/`. This project customises the settings, launcher, main and properties templates and keeps Unity's default root `build.gradle`.

| Template | Generated file | What it controls |
| --- | --- | --- |
| `settingsTemplate.gradle` | `settings.gradle` | Which modules exist; where plugins and libraries are downloaded from |
| `baseProjectTemplate.gradle` | `build.gradle` | The AGP version, declared once for all modules |
| `launcherTemplate.gradle` | `launcher/build.gradle` | The installable app: ID, versions, packaging, signing |
| `mainTemplate.gradle` | `unityLibrary/build.gradle` | The Unity player library: dependencies, native CMake build |
| `gradleTemplate.properties` | `gradle.properties` | Settings for the Gradle process and AGP |

Templates contain tokens such as `**MINSDK**`, `**TARGETSDK**` and `**DEPS**`. Unity replaces each token with a value from Player Settings or the build. `**APIVERSION**` equals the target SDK and fills `compileSdk`. Unity replaces tokens anywhere in the file, so a literal `**DEPS**` inside a comment corrupts the template.

Each template also carries a format version, `unityTemplateVersion`. It was 18 in Unity 6000.0.37 and is 26 in 6000.6.6. Unity reports an error when a custom template is older than it expects.

Templates are not the only extension point. Packages and editor scripts can implement `IPostGenerateGradleAndroidProject`, or use `AndroidProjectFilesModifier`, to edit the generated project before Gradle runs.

## Plugins and libraries

<figure class="figure-media"><img src="./images/projects/unity-gradle/plugins-vs-libraries.svg" alt="Two lanes: plugins resolved from pluginManagement repositories run on the build machine as the Android Gradle Plugin; libraries resolved from dependencyResolutionManagement repositories are packaged into the APK and run on the Quest" width="760" height="432" loading="lazy"><figcaption>Plugins and libraries come from separate repository lists and end up in different places. The grey lane runs on the build machine; the orange lane ends up on the headset. The dashed arrow marks where the plugin packages the libraries into the APK. Repository lists are copied from the project's settingsTemplate.gradle.</figcaption></figure>

A plugin runs on the build machine and is never shipped. AGP 9.1.1 is the plugin here. It adds the `android { }` block and the tasks that compile, dex, merge and sign. A library is code that ships inside the APK and runs on the Quest.

Gradle resolves the two from separate lists in `settings.gradle`. `pluginManagement.repositories` serves only plugins. `dependencyResolutionManagement.repositories` serves only libraries. Gradle never copies one list into the other.

`google()` appears in both lists because Google's Maven repository hosts AGP itself and the AndroidX libraries. The root `build.gradle` asks for `id 'com.android.application' version '9.1.1'`. Gradle finds that plugin through its marker artifact on Google's repository.

`flatDir` appears only in the library list. It finds a file such as `OVRPlugin.aar` by name in `unityLibrary/libs`. A flatDir file has no metadata, so Gradle cannot learn what that AAR itself depends on. Those dependencies must be declared by hand, which is why `kotlin-stdlib` and AndroidX libraries appear explicitly in `mainTemplate.gradle`.

Dependencies use two notations. A string such as `'androidx.appcompat:appcompat:1.6.1'` names a Maven artifact by group, name and version. A map such as `(name: 'OVRPlugin', ext: 'aar')` names a file for flatDir. Gradle 9.1 deprecated the map notation, and Gradle 10 will reject it.

`RepositoriesMode.PREFER_SETTINGS` makes the settings list the only one that counts. Repositories declared in a module are ignored with a warning. This project's old template still declared repositories in `buildscript` and `allprojects` blocks. They produced six warnings such as "repository 'Google' was added by build file 'unityLibrary\build.gradle'".

<details>
<summary>Repository modes</summary>

| Mode | When a module declares its own repositories |
| --- | --- |
| `PREFER_PROJECT` (default) | The module uses only its own list; the settings list is ignored for it |
| `PREFER_SETTINGS` | The module's list is ignored, with a warning |
| `FAIL_ON_PROJECT_REPOS` | The build fails |

</details>

## Two modules

<figure class="figure-media"><img src="./images/projects/unity-gradle/modules.svg" alt="Module graph: launcher depends on unityLibrary, which depends on xrmanifest.androidlib, local AARs and Maven libraries; unityLibrary also runs CMake to build libgame.so and libswappywrapper.so using prefab headers from games-activity" width="760" height="524" loading="lazy"><figcaption>The app module is a thin shell around one library module that holds the whole player. Arrows point from a module to what it depends on. The dashed arrow shows the headers and static libraries that CMake takes from the games-activity and games-frame-pacing AARs. Versions are those pinned in the project's mainTemplate.gradle.</figcaption></figure>

`launcher` applies `com.android.application`, so it produces an installable APK. It owns everything that identifies the app on the device: application ID, version, SDK levels, icons and signing. Its only dependency is `implementation project(':unityLibrary')`.

`unityLibrary` applies `com.android.library` and produces an AAR. It holds the player, the game data, the Java plug-ins and the native build. Because it is a library, another Android app can embed it; Unity calls this Unity as a Library.

`implementation` puts a dependency on this module's compile and runtime classpaths. Modules that depend on this one receive it at runtime but cannot compile against it. `api` would expose it at compile time too.

Three SDK numbers have different jobs. `compileSdk` (34) decides which Android APIs the code may call. `minSdk` (32, Android 12L) is the oldest Android version that can install the app. `targetSdk` (34) chooses which behaviour changes the app opts into. Meta requires `targetSdk` 34 for newly created store apps.

Both build types set `minifyEnabled false`, so D8 converts the Java bytecode to dex. With minification on, R8 would replace D8 and also shrink, optimise and obfuscate. Unity's keep rules in `proguard-unity.txt` would then protect classes that native code reaches by name.

Both build types also sign with the Android debug key. The release APK carries an APK Signature Scheme v2 signature from that key. A store build needs a project keystore set under Publishing Settings, because Meta requires a unique key.

<details>
<summary>launcher fields and their values in this build</summary>

| Field | Value | Meaning |
| --- | --- | --- |
| `compileSdk` | 34 | Android APIs available at compile time |
| `minSdk` | 32 | Oldest Android version that can install the app (12L) |
| `targetSdk` | 34 | Behaviour version the app opts into |
| `buildToolsVersion` | 36.0.0 | aapt2 and packaging tools |
| `ndkVersion` | 27.2.12479018 | C/C++ toolchain bundled with Unity |
| `abiFilters` | `arm64-v8a` | Only 64-bit ARM libraries are packaged |
| `versionCode` / `versionName` | 301 / 0.3.1 | Set by the project's build script |
| `debugSymbolLevel` | `none` | No separate native symbol file |
| Java compatibility | 17 | Source and bytecode level; Gradle runs on Unity's JDK 17 |

</details>

<details>
<summary>unityLibrary dependencies</summary>

| Dependency | Source | Role |
| --- | --- | --- |
| `OVRPlugin`, `InteractionSdk` | local AAR | Meta XR runtime and Interaction SDK |
| `sherpa_onnx-release` | local AAR | ONNX Runtime and JNI for on-device text-to-speech |
| `data-channel-android-release` | local AAR | The project's WebRTC data-channel library |
| `unityopus`, `espeak_bridge-release` | local AAR | Opus codec for the voice SDK; eSpeak speech bridge |
| `xrmanifest.androidlib` | project module | Manifest entries for the XR loader |
| `kotlin-stdlib:2.2.20` | Maven | Kotlin runtime that prebuilt AARs need |
| `appcompat`, `core`, `constraintlayout` | Maven | AndroidX libraries that GameActivity requires |
| `games-activity:4.4.0`, `games-frame-pacing:2.1.2` | Maven | Headers and static libraries for the CMake build |
| `fileTree(dir: 'libs', include: ['*.jar'])` | local JARs | `unity-classes.jar`, the voice SDK JARs and others |

An AAR in `libs/` is packaged only if it is declared. Two AARs in the folder, including a 62.5 MB `libwebrtc.aar`, are not declared and do not reach the APK.

</details>

## Manifest merging

An APK has exactly one `AndroidManifest.xml`. AGP builds it by merging several sources, with the app module taking priority over libraries.

The launcher manifest contributes the icon, label and screen support. The library manifest starts from `Assets/Plugins/Android/AndroidManifest.xml`. Unity adds permissions, the activity attributes and its own metadata, such as `extractNativeLibs="true"`. The `xrmanifest.androidlib` module and every AAR add their own entries.

Before Gradle runs, twelve `IPostGenerateGradleAndroidProject` callbacks from the Meta XR SDK, OpenXR and XR Management edit these files. When two sources set the same value, a `tools:replace` rule decides the winner. This project uses one for the `com.oculus.supportedDevices` list.

The merged result declares `com.unity3d.player.UnityPlayerGameActivity` as the launchable activity. Its intent filter includes `com.oculus.intent.category.VR`, which marks the app as immersive on Quest.

## Native libraries

Native libraries reach the APK by three routes. Unity places its own and plug-in libraries in `unityLibrary/src/main/jniLibs`. AARs carry theirs in a `jni/` folder. CMake compiles the rest during the Gradle build.

| Library | Size | Route | Contents |
| --- | --- | --- | --- |
| `libsherpa-onnx-jni.so` | 119.2 MB | AAR | Speech model runtime and JNI |
| `libil2cpp.so` | 101.6 MB | jniLibs (IL2CPP) | All runtime C# of the project and its packages |
| `libopencvforunity.so` | 32.3 MB | jniLibs (plug-in) | OpenCV for Unity |
| `libunity.so` | 24.2 MB | jniLibs (prebuilt) | The Unity engine |
| `libonnxruntime.so` | 19.3 MB | AAR | ONNX Runtime |
| `liblivekit_ffi.so` | 18.3 MB | jniLibs (package) | LiveKit client core |
| `libOVRPlugin.so` | 7.0 MB | AAR | Meta XR runtime |
| `libswappywrapper.so` | 4.7 MB | CMake | Unity's wrapper around Swappy frame pacing |
| `libc++_shared.so` | 1.8 MB | CMake | The NDK's C++ standard library |
| `libgame.so` | 1.4 MB | CMake | Unity's GameActivity bridge |
| `libmain.so` | 6.7 KB | jniLibs (prebuilt) | Unity's loader |

Sizes are uncompressed. The table lists 11 of the 26 libraries.

`libil2cpp.so` holds compiled code only. Type names, method names and string literals live in `assets/bin/Data/Managed/Metadata/global-metadata.dat`, 22.6 MB in this build. Editor scripts are never compiled into the player.

The app starts through GameActivity, chosen under Player Settings › Application Entry Point. `UnityPlayerGameActivity` extends `GameActivity` and loads `libgame.so`, the bridge that forwards lifecycle and input events to the engine. `libmain.so` contains Unity's loader code, which loads `libunity.so` and `libil2cpp.so`.

`libgame.so` is compiled during the Gradle build because its bridge source ships with the project. The games-activity AAR provides headers and a static library in prefab format. `prefab true` lets CMake find them with `find_package(game-activity REQUIRED CONFIG)`. Prefab here is an AAR packaging format, unrelated to Unity prefabs.

Unity passes `-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON` to that CMake build. The flag aligns the libraries for devices with 16 KB memory pages, which Android 15 introduced. It affects only libraries this CMake build compiles, not prebuilt ones.

`libswappywrapper.so` exists because Optimized Frame Pacing is enabled. Swappy paces frames for ordinary phone displays. On a headset, Unity's documentation states that the XR SDK controls the frame rate instead.

## Inside the APK

<figure class="figure-media"><img src="./images/projects/unity-gradle/apk-anatomy.svg" alt="Bar chart of the APK's contents: native libraries 361.5 MB uncompressed and 112.9 MB in the APK; assets 103.9 MB and 33.5 MB; classes.dex 7.5 MB stored; manifest and resources 0.6 MB and 0.5 MB" width="760" height="398" loading="lazy"><figcaption>Native libraries make up 73% of the 154.6 MB APK, and they are stored compressed. Each row compares a part's uncompressed size (grey) with its size inside the APK (orange). The right column names the component that reads it on the headset. Sizes are the zip entry sizes of the project's release APK.</figcaption></figure>

An APK is a zip file with fixed locations. `lib/arm64-v8a/` holds the native libraries. `assets/` holds files the app reads itself, here Unity's game data. `classes.dex` holds all Java and Kotlin code, 7.5 MB in a single file. `AndroidManifest.xml` and `resources.arsc` describe the app to Android.

All 26 `.so` files are compressed because the launcher sets `useLegacyPackaging = true`. The installer extracts them to disk, and the dynamic linker loads them from there. AGP's default stores them uncompressed and page-aligned, so they load straight from the APK. Compression keeps the APK file smaller but takes more space after installation.

Some files must stay uncompressed. Unity's `noCompress` list keeps `.unity3d`, `.ress`, `.resource`, `.obb`, `.bundle` and `.unityexp` files as-is, plus the StreamingAssets types, here `.json`. Unity can then read them directly from the APK. The dex file and `resources.arsc` are stored uncompressed as well.

`abiFilters 'arm64-v8a'` keeps only 64-bit ARM libraries in `lib/`, which Meta requires. It does not apply to `assets/`. The OVRPlugin AAR ships helper libraries for both ARM ABIs inside its assets, so 32-bit copies still appear there.

## Debug symbols

A crash report from a headset contains raw addresses. Debug symbols map those addresses back to function names and source lines. Symbols are large, so release builds usually strip them from the shipped libraries and keep them in separate files.

Unity strips its own three libraries before Gradle runs. `libil2cpp.so` has a full debug copy of 968.7 MB in `Library/Bee`, and the shipped version is 101.6 MB. `libunity.so` shrinks from 34.6 MB to 24.2 MB the same way.

Gradle's task `stripReleaseDebugSymbols` is meant to strip all other libraries. A library is skipped when it matches a `keepDebugSymbols` pattern. The launcher template adds `'*/arm64-v8a/*.so'`, which matches every library in the APK. As a result `libgame.so` and `libswappywrapper.so` ship with their full debug sections.

Unity's script prints "symbols will be stripped" for release builds. The message only means that the script added no keep rule of its own. The template's broader pattern still applies.

| Debug Symbols setting | `debugSymbolLevel` | Symbol file contents |
| --- | --- | --- |
| Disabled | `none` | No symbol file |
| Public | `symbol_table` | Function names and addresses (`.sym`) |
| Debugging | `full` | Names, source files and line numbers (`.dbg`) |

The setting lives in the Android build profile. For an APK, AGP writes the symbols to `native-debug-symbols.zip` under `build/outputs/native-debug-symbols/`. Unity's `setupSymbols.gradle` adds the IL2CPP symbols to that file. With `none`, the script returns immediately.

## Gradle properties

`gradle.properties` holds key-value settings for the Gradle process and AGP. It declares no plugins and no dependencies. Unity appends its own block through the `**ADDITIONAL_PROPERTIES**` token.

`org.gradle.jvmargs=-Xmx4096M` sets the heap of the Gradle process on the build machine. It has no effect on the app's memory on the headset. `org.gradle.parallel=true` lets independent modules build at the same time; `launcher` still waits for `unityLibrary`.

`android.enableJetifier=true` rewrites old Support Library bytecode to AndroidX. Unity writes it, and AGP 9.1.1 warns that the option is deprecated and will be removed in AGP 10. `android.builtInKotlin=false` receives the same warning. It turns off the Kotlin compiler that AGP 9 enables by default, which this project does not need.

The project's template also sets `android.enableAapt2Jemalloc=false` and `android.enableResourceShrinking=false`. Neither is an option that AGP 9.1.1 recognises, so both lines do nothing. Resource shrinking is a build-type setting, `shrinkResources true`, and it requires minification.

<details>
<summary>Keys Unity appends to gradle.properties</summary>

Most keys mirror values already written into the `build.gradle` files. Unity's helper scripts read them while Gradle runs.

| Key | Value | Read by or mirrors |
| --- | --- | --- |
| `unityTemplateVersion` | 26 | Unity's template version check |
| `unity.debugSymbolLevel` | `none` | `setupSymbols.gradle` |
| `unity.installInBuildFolder` | `false` | `common.gradle`, which disables test tasks only when `true` |
| `unity.minSdkVersion` / `targetSdkVersion` / `compileSdkVersion` | 32 / 34 / 34 | `minSdk`, `targetSdk`, `compileSdk` |
| `unity.agpVersion` | 9.1.1 | The root `build.gradle` |
| `unity.androidNdkVersion` | 27.2.12479018 | `ndkVersion` |
| `unity.javaCompatibilityVersion` | `VERSION_17` | Java level in both modules |
| `android.r8.strictFullModeForKeepRules` | `false` | Relaxed R8 keep-rule checking; unused while minify is off |
| `android.bundle.includeNativeDebugMetadata` | `false` | Keeps native debug data out of app bundles |

</details>

## Upgrading Unity: two failures

The project moved from Unity 6000.0.37 to 6000.6.6. Unity 6000.6.6 ships Gradle 9.3.1 and AGP 9.1.1. The old custom `mainTemplate.gradle` still pinned AGP 7.4.2, applied the Kotlin plugin and requested games-activity 3.0.5.

The first build failed during configuration. The old template applied `kotlin-android`, and Gradle reported "Failed to apply plugin 'kotlin-android'" with a class-cast error inside AGP's extension. AGP 9 has its own Kotlin support and a new DSL, and the old Kotlin plugin cannot attach to it. The project has no Kotlin source anyway. Its prebuilt AARs only need the Kotlin runtime, so the plugin became the library `kotlin-stdlib:2.2.20`.

Both modules now exclude `kotlin-stdlib-jdk7` and `kotlin-stdlib-jdk8`. Since Kotlin 1.8 their classes live in `kotlin-stdlib`, so older AARs that still request them would add duplicate classes.

The second build failed during execution, in the task `buildCMakeRelWithDebInfo[arm64-v8a]`. Clang reported `GameActivity_getLocaleLanguage` and `GameActivity_getLocaleCountry` as undeclared in Unity's `UGAConfiguration.cpp`. The headers came from games-activity 3.0.5, which predates those functions. Unity recommends games-activity 4.4.x for Unity 6000.3 and later. With 4.4.0 pinned, the build succeeded.

Both failures share one cause. Version pins in a custom template stay frozen when Unity upgrades. Comparing each custom template with the new default after an upgrade catches this early.

The first place to look after a failure is `launcher/build/outputs/logs/unity-assembleRelease-build.log` in the generated project. Unity's `Editor.log` holds the same output with the surrounding Unity steps. For deeper debugging, Export Project opens the identical build in Android Studio.

## Related

- [VR Teleoperation Platform](#/projects/vr-teleoperation): the Quest app this build produces
