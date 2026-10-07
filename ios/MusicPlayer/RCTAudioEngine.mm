#import "RCTAudioEngine.h"
#import <AVFoundation/AVFoundation.h>

@implementation RCTAudioEngine {
  AVPlayer *_player;
  NSArray<NSDictionary *> *_tracks;
  NSInteger _index;
}
RCT_EXPORT_MODULE(NativeAudioEngine)
+ (BOOL)requiresMainQueueSetup { return NO; }
- (instancetype)init {
  if ((self = [super init])) {
    _tracks = @[];
    [NSNotificationCenter.defaultCenter addObserver:self selector:@selector(finished:) name:AVPlayerItemDidPlayToEndTimeNotification object:nil];
    [NSNotificationCenter.defaultCenter addObserver:self selector:@selector(interrupted:) name:AVAudioSessionInterruptionNotification object:nil];
    [NSNotificationCenter.defaultCenter addObserver:self selector:@selector(routeChanged:) name:AVAudioSessionRouteChangeNotification object:nil];
  }
  return self;
}
- (void)selectIndex:(NSInteger)index {
  _index = index;
  AVPlayerItem *item = [AVPlayerItem playerItemWithURL:[NSURL URLWithString:_tracks[index][@"uri"]]];
  if (!_player) _player = [AVPlayer new];
  [_player replaceCurrentItemWithPlayerItem:item];
}
- (void)setQueue:(NSArray *)tracks index:(double)index resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    for (NSDictionary *track in tracks) {
      if (![[NSURL URLWithString:track[@"uri"]] isFileURL]) { reject(@"INVALID_SOURCE", @"Only imported local files are supported.", nil); return; }
    }
    if (tracks.count && (!isfinite(index) || index < 0 || index >= tracks.count)) { reject(@"INVALID_INDEX", @"Invalid queue position.", nil); return; }
    [self->_player pause];
    self->_tracks = [tracks copy];
    self->_index = 0;
    if (tracks.count) [self selectIndex:(NSInteger)index];
    else [self->_player replaceCurrentItemWithPlayerItem:nil];
    resolve(nil);
  });
}
- (void)play:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!self->_player.currentItem) { reject(@"NO_TRACK", @"Choose a track first.", nil); return; }
    NSError *error;
    [AVAudioSession.sharedInstance setCategory:AVAudioSessionCategoryPlayback error:&error];
    if (!error) [AVAudioSession.sharedInstance setActive:YES error:&error];
    if (error) { reject(@"AUDIO_SESSION", error.localizedDescription, error); return; }
    [self->_player play]; resolve(nil);
  });
}
- (void)pause:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{ [self->_player pause]; resolve(nil); });
}
- (void)seek:(double)seconds resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!isfinite(seconds) || seconds < 0) { reject(@"INVALID_SEEK", @"Invalid seek position.", nil); return; }
    if (!self->_player.currentItem) { reject(@"NO_TRACK", @"Choose a track first.", nil); return; }
    [self->_player seekToTime:CMTimeMakeWithSeconds(seconds, 600) completionHandler:^(BOOL finished) { resolve(nil); }];
  });
}
- (void)move:(NSInteger)delta resolve:(RCTPromiseResolveBlock)resolve {
  dispatch_async(dispatch_get_main_queue(), ^{
    NSInteger next = self->_index + delta;
    if (next >= 0 && next < self->_tracks.count) {
      BOOL playing = self->_player.rate > 0;
      [self selectIndex:next];
      if (playing) [self->_player play];
    }
    resolve(nil);
  });
}
- (void)next:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { [self move:1 resolve:resolve]; }
- (void)previous:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { [self move:-1 resolve:resolve]; }
- (void)finished:(NSNotification *)notification {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (notification.object == self->_player.currentItem && self->_index + 1 < self->_tracks.count) {
      [self selectIndex:self->_index + 1]; [self->_player play];
    }
  });
}
- (void)interrupted:(NSNotification *)notification {
  if ([notification.userInfo[AVAudioSessionInterruptionTypeKey] integerValue] == AVAudioSessionInterruptionTypeBegan)
    dispatch_async(dispatch_get_main_queue(), ^{ [self->_player pause]; });
}
- (void)routeChanged:(NSNotification *)notification {
  if ([notification.userInfo[AVAudioSessionRouteChangeReasonKey] integerValue] == AVAudioSessionRouteChangeReasonOldDeviceUnavailable)
    dispatch_async(dispatch_get_main_queue(), ^{ [self->_player pause]; });
}
- (void)getStatus:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    double position = self->_player ? CMTimeGetSeconds(self->_player.currentTime) : 0;
    double duration = self->_player.currentItem ? CMTimeGetSeconds(self->_player.currentItem.duration) : 0;
    resolve(@{@"trackId": self->_tracks.count ? self->_tracks[self->_index][@"id"] : @"",
      @"playing": @(self->_player.rate > 0), @"position": @(isfinite(position) ? MAX(0, position) : 0),
      @"duration": @(isfinite(duration) ? MAX(0, duration) : 0),
      @"error": self->_player.currentItem.error.localizedDescription ?: @""});
  });
}
- (void)invalidate {
  [NSNotificationCenter.defaultCenter removeObserver:self];
  dispatch_async(dispatch_get_main_queue(), ^{ [self->_player pause]; self->_player = nil; });
}
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeAudioEngineSpecJSI>(params);
}
@end
