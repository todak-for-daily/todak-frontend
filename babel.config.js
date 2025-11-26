module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false, // .env 파일이 없어도 에러 발생 안함
        allowUndefined: true, // 정의되지 않은 변수 허용
        verbose: false, // 불필요한 로그 제거 (다른 파일 찾기 시도 메시지 숨김)
      },
    ],
  ],
};