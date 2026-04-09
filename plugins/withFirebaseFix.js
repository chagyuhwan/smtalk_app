const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // CDN + GitHub 소스 추가 (jsdelivr.net 차단 우회)
      if (!contents.includes("source 'https://github.com/CocoaPods/Specs.git'")) {
        contents = "source 'https://github.com/CocoaPods/Specs.git'\n" + contents;
      }
      if (!contents.includes("source 'https://cdn.cocoapods.org/'")) {
        contents = "source 'https://cdn.cocoapods.org/'\n" + contents;
      }

      // $RNFirebaseAsStaticFramework은 use_frameworks! 보다 앞에 와야 함
      if (!contents.includes('$RNFirebaseAsStaticFramework')) {
        contents = "$RNFirebaseAsStaticFramework = true\n" + contents;
      }

      // CocoaPods 1.16+은 post_install 블록이 2개 이상이면 에러
      // 기존 post_install 블록 안에 삽입
      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        const patch = `  installer.pods_project.targets.each do |tgt|
    tgt.build_configurations.each do |build_cfg|
      build_cfg.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end\n`;
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${patch}`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
