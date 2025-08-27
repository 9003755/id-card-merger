# 百度OCR API配置更新

**更新时间**: 2025-08-26

## 配置变更

根据最新的baidu_api规则，已更新OCR API配置：

### 新配置信息
- **App ID**: 119868043
- **API Key**: WYCtNFVBM4dh4eYvrI29Wsos  
- **Secret Key**: qWwWkr8uU59TwSHQO0NpafeiqRtN8lTG

### 旧配置信息
- **App ID**: 119840131
- **API Key**: WLSdDFtDY2NFhbgyLBaJcJOu
- **Secret Key**: XZKzd14HDHkkzpblkTNVoYcWuEd8G5qN

## 更新内容

### 1. 更新文件
- `src/utils/ocrUtils.ts` - 更新DEFAULT_OCR_CONFIG中的API密钥

### 2. 安全措施
- API密钥在界面上继续保持遮蔽显示
- 遮蔽格式：显示前4位和后4位，中间用*号隐藏
- 配置在代码中预设，用户无需手动输入

### 3. 功能验证
- ✅ 代码编译无错误
- ✅ 热更新已自动应用
- ✅ 开发服务器正常运行

## 使用建议

1. **重新测试连接**: 建议点击"测试API连接"按钮验证新配置
2. **功能验证**: 上传身份证图片测试OCR识别功能
3. **问题排查**: 如遇问题，新的诊断工具可快速定位原因

## 技术细节

新的API密钥已自动集成到系统中，用户界面显示：
- API Key: `WYCt****Wsos`
- Secret Key: `qWwW****lTG`

---

**状态**: ✅ 配置更新完成  
**测试**: 请验证OCR功能是否正常工作