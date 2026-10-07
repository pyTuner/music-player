package com.musicplayer

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class MusicPackage : BaseReactPackage() {
  override fun getModule(name: String, context: ReactApplicationContext): NativeModule? = when (name) {
    "NativeMusicLibrary" -> MusicLibraryModule(context)
    "NativeAudioEngine" -> AudioEngineModule(context)
    else -> null
  }
  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    listOf("NativeMusicLibrary", "NativeAudioEngine").associateWith { name ->
      ReactModuleInfo(name, name, false, false, false, true)
    }
  }
}
