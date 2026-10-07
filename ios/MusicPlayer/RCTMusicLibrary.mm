#import "RCTMusicLibrary.h"
#import <AVFoundation/AVFoundation.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <React/RCTUtils.h>

@implementation RCTMusicLibrary {
  RCTPromiseResolveBlock _pickerResolve;
  RCTPromiseRejectBlock _pickerReject;
  dispatch_queue_t _worker;
}
RCT_EXPORT_MODULE(NativeMusicLibrary)
+ (BOOL)requiresMainQueueSetup { return NO; }
- (instancetype)init {
  if ((self = [super init])) _worker = dispatch_queue_create("music.library", DISPATCH_QUEUE_SERIAL);
  return self;
}
- (NSURL *)directory {
  NSURL *documents = [NSFileManager.defaultManager URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].firstObject;
  NSURL *audio = [documents URLByAppendingPathComponent:@"audio" isDirectory:YES];
  [NSFileManager.defaultManager createDirectoryAtURL:audio withIntermediateDirectories:YES attributes:nil error:nil];
  return audio;
}
- (NSDictionary *)metadata:(NSURL *)url {
  AVURLAsset *asset = [AVURLAsset URLAssetWithURL:url options:nil];
  NSString *name = url.lastPathComponent;
  NSString *title = name.length > 37 ? [name substringFromIndex:37].stringByDeletingPathExtension : name.stringByDeletingPathExtension;
  NSString *artist = @"Unknown artist";
  NSString *album = @"Imported audio";
  for (AVMetadataItem *item in asset.commonMetadata) {
    if ([item.commonKey isEqual:AVMetadataCommonKeyTitle] && item.stringValue.length) title = item.stringValue;
    if ([item.commonKey isEqual:AVMetadataCommonKeyArtist] && item.stringValue.length) artist = item.stringValue;
    if ([item.commonKey isEqual:AVMetadataCommonKeyAlbumName] && item.stringValue.length) album = item.stringValue;
  }
  double duration = CMTimeGetSeconds(asset.duration);
  return @{@"id": [@"import:" stringByAppendingString:name], @"uri":url.absoluteString,
    @"title":title, @"artist":artist, @"album":album, @"duration":@(isfinite(duration) ? MAX(0, duration) : 0)};
}
- (void)scan:(BOOL)includeRecordings resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(_worker, ^{
    NSError *error;
    NSArray<NSURL *> *files = [NSFileManager.defaultManager contentsOfDirectoryAtURL:[self directory] includingPropertiesForKeys:nil options:NSDirectoryEnumerationSkipsHiddenFiles error:&error];
    if (error) { reject(@"SCAN_FAILED", error.localizedDescription, error); return; }
    NSMutableArray *tracks = [NSMutableArray new];
    for (NSURL *url in files) {
      UTType *type = [UTType typeWithFilenameExtension:url.pathExtension];
      if ([type conformsToType:UTTypeAudio]) [tracks addObject:[self metadata:url]];
    }
    resolve(tracks);
  });
}
- (void)importFiles:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self->_pickerResolve) { reject(@"BUSY", @"A file picker is already open.", nil); return; }
    UIViewController *presenter = RCTPresentedViewController();
    if (!presenter) { reject(@"NO_ACTIVITY", @"Open the app before importing files.", nil); return; }
    self->_pickerResolve = resolve; self->_pickerReject = reject;
    UIDocumentPickerViewController *picker = [[UIDocumentPickerViewController alloc] initForOpeningContentTypes:@[UTTypeAudio] asCopy:YES];
    picker.allowsMultipleSelection = YES; picker.delegate = self;
    [presenter presentViewController:picker animated:YES completion:nil];
  });
}
- (void)documentPickerWasCancelled:(UIDocumentPickerViewController *)controller {
  if (_pickerResolve) _pickerResolve(@[]);
  _pickerResolve = nil; _pickerReject = nil;
}
- (void)documentPicker:(UIDocumentPickerViewController *)controller didPickDocumentsAtURLs:(NSArray<NSURL *> *)urls {
  RCTPromiseResolveBlock resolve = _pickerResolve;
  RCTPromiseRejectBlock reject = _pickerReject;
  _pickerResolve = nil; _pickerReject = nil;
  dispatch_async(_worker, ^{
    NSMutableArray *tracks = [NSMutableArray new];
    for (NSURL *url in urls) {
      BOOL scoped = [url startAccessingSecurityScopedResource];
      NSURL *destination = [[self directory] URLByAppendingPathComponent:[NSString stringWithFormat:@"%@_%@", NSUUID.UUID.UUIDString, url.lastPathComponent]];
      NSError *error;
      BOOL copied = [NSFileManager.defaultManager copyItemAtURL:url toURL:destination error:&error];
      if (scoped) [url stopAccessingSecurityScopedResource];
      if (!copied) { reject(@"IMPORT_FAILED", error.localizedDescription, error); return; }
      [tracks addObject:[self metadata:destination]];
    }
    resolve(tracks);
  });
}
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeMusicLibrarySpecJSI>(params);
}
@end
