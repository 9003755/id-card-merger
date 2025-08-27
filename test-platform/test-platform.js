// 百度OCR API测试平台核心逻辑
// 根据项目记忆中的API配置和规范设计

const BAIDU_CONFIG = {
    apiKey: 'WYCtNFVBM4dh4eYvrI29Wsos',
    secretKey: 'qWwWkr8uU59TwSHQO0NpafeiqRtN8lTG',
    appId: '119868043'
};

let testResults = {
    network: null,
    tokenDirect: null,
    tokenProxy: null,
    ocrDirect: null,
    ocrProxy: null,
    performance: null
};

// 工具函数：记录日志
function log(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    const timestamp = new Date().toLocaleTimeString();
    const className = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
    
    element.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
    element.scrollTop = element.scrollHeight;
}

// 工具函数：清空日志
function clearLog(elementId) {
    document.getElementById(elementId).innerHTML = '';
}

// 工具函数：图片预览
function previewImage() {
    const fileInput = document.getElementById('imageFile');
    const imagePreview = document.getElementById('imagePreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

// 工具函数：文件转Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 测试1：网络连通性检查
async function testNetworkConnectivity() {
    clearLog('networkResult');
    log('networkResult', '开始网络连通性测试...');
    
    try {
        // 测试1.1：基础网络连接
        log('networkResult', '测试1.1：检查基础网络连接...');
        
        const response = await fetch('https://www.baidu.com/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache'
        });
        
        log('networkResult', '✅ 基础网络连接正常', 'success');
        
        // 测试1.2：百度API服务器连通性
        log('networkResult', '测试1.2：检查百度API服务器连通性...');
        
        try {
            const apiResponse = await fetch('https://aip.baidubce.com', {
                method: 'HEAD',
                mode: 'no-cors'
            });
            log('networkResult', '✅ 百度API服务器可达', 'success');
        } catch (error) {
            log('networkResult', '⚠️ 百度API服务器连接可能受限', 'error');
        }
        
        // 测试1.3：CORS预检
        log('networkResult', '测试1.3：检查CORS策略...');
        
        try {
            const corsResponse = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
                method: 'OPTIONS'
            });
            log('networkResult', '✅ CORS预检通过', 'success');
        } catch (error) {
            log('networkResult', '❌ CORS预检失败：' + error.message, 'error');
            log('networkResult', '建议：使用后端代理避免CORS问题', 'info');
        }
        
        testResults.network = { success: true, message: '网络连通性测试完成' };
        
    } catch (error) {
        log('networkResult', '❌ 网络连通性测试失败：' + error.message, 'error');
        testResults.network = { success: false, error: error.message };
    }
}

// 测试2.1：前端直接获取令牌
async function testTokenDirect() {
    clearLog('tokenResult');
    log('tokenResult', '开始前端直接获取访问令牌测试...');
    
    try {
        log('tokenResult', '构建请求参数...');
        
        // 根据第三方API调用规范，使用正确的请求格式
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', BAIDU_CONFIG.apiKey);
        params.append('client_secret', BAIDU_CONFIG.secretKey);
        
        log('tokenResult', '发送请求到百度OAuth API...');
        
        const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params.toString()
        });
        
        log('tokenResult', `响应状态: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`API错误: ${data.error_description || data.error}`);
        }
        
        if (data.access_token) {
            log('tokenResult', '✅ 成功获取访问令牌', 'success');
            log('tokenResult', `令牌长度: ${data.access_token.length}`, 'info');
            log('tokenResult', `有效期: ${data.expires_in}秒`, 'info');
            
            testResults.tokenDirect = { 
                success: true, 
                token: data.access_token,
                expiresIn: data.expires_in
            };
        } else {
            throw new Error('响应中没有访问令牌');
        }
        
    } catch (error) {
        log('tokenResult', '❌ 前端直接获取令牌失败：' + error.message, 'error');
        
        if (error.message.includes('CORS')) {
            log('tokenResult', '原因：浏览器CORS策略阻止', 'error');
            log('tokenResult', '解决方案：使用后端代理', 'info');
        }
        
        testResults.tokenDirect = { success: false, error: error.message };
    }
}

// 测试2.2：后端代理获取令牌
async function testTokenProxy() {
    clearLog('tokenResult');
    log('tokenResult', '开始后端代理获取访问令牌测试...');
    
    try {
        log('tokenResult', '检查后端服务器状态...');
        
        // 首先检查后端服务器是否可用
        const healthResponse = await fetch('http://localhost:3001/api/health');
        
        if (!healthResponse.ok) {
            throw new Error('后端服务器不可用，请确保server.js已启动');
        }
        
        log('tokenResult', '✅ 后端服务器运行正常', 'success');
        log('tokenResult', '通过后端代理获取令牌...');
        
        const response = await fetch('http://localhost:3001/api/test', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            log('tokenResult', '✅ 后端代理获取令牌成功', 'success');
            log('tokenResult', `令牌状态: ${data.data.hasToken ? '已获取' : '未获取'}`, 'info');
            log('tokenResult', `令牌长度: ${data.data.tokenLength}`, 'info');
            
            testResults.tokenProxy = { 
                success: true, 
                hasToken: data.data.hasToken,
                tokenLength: data.data.tokenLength
            };
        } else {
            throw new Error(data.error || '后端代理获取令牌失败');
        }
        
    } catch (error) {
        log('tokenResult', '❌ 后端代理获取令牌失败：' + error.message, 'error');
        
        if (error.message.includes('fetch')) {
            log('tokenResult', '提示：请确保后端服务器已启动 (node server.js)', 'info');
        }
        
        testResults.tokenProxy = { success: false, error: error.message };
    }
}

// 测试3.1：前端直接OCR识别
async function testOCRDirect() {
    const fileInput = document.getElementById('imageFile');
    
    if (!fileInput.files || !fileInput.files[0]) {
        log('ocrResult', '❌ 请先选择一张身份证图片', 'error');
        return;
    }
    
    clearLog('ocrResult');
    log('ocrResult', '开始前端直接OCR识别测试...');
    
    try {
        const file = fileInput.files[0];
        log('ocrResult', `图片信息: ${file.name} (${(file.size/1024).toFixed(2)}KB)`);
        
        // 先获取访问令牌
        log('ocrResult', '步骤1：获取访问令牌...');
        
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'client_credentials');
        tokenParams.append('client_id', BAIDU_CONFIG.apiKey);
        tokenParams.append('client_secret', BAIDU_CONFIG.secretKey);
        
        const tokenResponse = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenParams.toString()
        });
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
            throw new Error('获取访问令牌失败');
        }
        
        log('ocrResult', '✅ 访问令牌获取成功', 'success');
        log('ocrResult', '步骤2：转换图片为Base64...');
        
        // 转换图片为Base64
        const base64Image = await fileToBase64(file);
        log('ocrResult', `图片Base64长度: ${base64Image.length}`, 'info');
        
        log('ocrResult', '步骤3：调用OCR识别API...');
        
        // 调用OCR识别API
        const ocrParams = new URLSearchParams();
        ocrParams.append('image', base64Image);
        ocrParams.append('id_card_side', 'front');
        
        const ocrResponse = await fetch(
            `https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=${tokenData.access_token}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: ocrParams.toString()
            }
        );
        
        const ocrData = await ocrResponse.json();
        
        if (ocrData.error_code) {
            throw new Error(`OCR识别失败: [${ocrData.error_code}] ${ocrData.error_msg}`);
        }
        
        if (ocrData.words_result) {
            log('ocrResult', '✅ OCR识别成功', 'success');
            log('ocrResult', `识别字段数: ${ocrData.words_result_num}`, 'info');
            
            if (ocrData.words_result.姓名) {
                log('ocrResult', `姓名: ${ocrData.words_result.姓名.words}`, 'success');
            }
            
            if (ocrData.words_result.公民身份号码) {
                log('ocrResult', `身份证号: ${ocrData.words_result.公民身份号码.words}`, 'success');
            }
            
            testResults.ocrDirect = {
                success: true,
                wordsNum: ocrData.words_result_num,
                name: ocrData.words_result.姓名?.words,
                idNumber: ocrData.words_result.公民身份号码?.words
            };
        } else {
            throw new Error('OCR响应中没有识别结果');
        }
        
    } catch (error) {
        log('ocrResult', '❌ 前端直接OCR识别失败：' + error.message, 'error');
        testResults.ocrDirect = { success: false, error: error.message };
    }
}

// 测试3.2：后端代理OCR识别
async function testOCRProxy() {
    const fileInput = document.getElementById('imageFile');
    
    if (!fileInput.files || !fileInput.files[0]) {
        log('ocrResult', '❌ 请先选择一张身份证图片', 'error');
        return;
    }
    
    clearLog('ocrResult');
    log('ocrResult', '开始后端代理OCR识别测试...');
    
    try {
        const file = fileInput.files[0];
        log('ocrResult', `图片信息: ${file.name} (${(file.size/1024).toFixed(2)}KB)`);
        
        // 检查后端服务器
        log('ocrResult', '步骤1：检查后端服务器状态...');
        
        const healthResponse = await fetch('http://localhost:3001/api/health');
        if (!healthResponse.ok) {
            throw new Error('后端服务器不可用');
        }
        
        log('ocrResult', '✅ 后端服务器运行正常', 'success');
        log('ocrResult', '步骤2：转换图片为Base64...');
        
        // 转换图片为Base64
        const base64Image = await fileToBase64(file);
        log('ocrResult', `图片Base64长度: ${base64Image.length}`, 'info');
        
        log('ocrResult', '步骤3：通过后端代理调用OCR...');
        
        // 通过后端代理调用OCR
        const response = await fetch('http://localhost:3001/api/ocr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Image,
                id_card_side: 'front'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            log('ocrResult', '✅ 后端代理OCR识别成功', 'success');
            log('ocrResult', `处理时间: ${data.meta.processingTime}ms`, 'info');
            log('ocrResult', `识别字段数: ${data.data.words_result_num}`, 'info');
            
            if (data.data.words_result.姓名) {
                log('ocrResult', `姓名: ${data.data.words_result.姓名.words}`, 'success');
            }
            
            if (data.data.words_result.公民身份号码) {
                log('ocrResult', `身份证号: ${data.data.words_result.公民身份号码.words}`, 'success');
            }
            
            testResults.ocrProxy = {
                success: true,
                processingTime: data.meta.processingTime,
                wordsNum: data.data.words_result_num,
                name: data.data.words_result.姓名?.words,
                idNumber: data.data.words_result.公民身份号码?.words
            };
        } else {
            throw new Error(data.error || '后端代理OCR识别失败');
        }
        
    } catch (error) {
        log('ocrResult', '❌ 后端代理OCR识别失败：' + error.message, 'error');
        testResults.ocrProxy = { success: false, error: error.message };
    }
}

// 测试4：性能测试
async function performanceTest() {
    clearLog('performanceResult');
    log('performanceResult', '开始性能测试...');
    
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    
    const testCount = 5;
    const results = [];
    
    try {
        for (let i = 0; i < testCount; i++) {
            log('performanceResult', `执行第 ${i + 1}/${testCount} 次测试...`);
            
            const startTime = Date.now();
            
            try {
                const response = await fetch('http://localhost:3001/api/test');
                const data = await response.json();
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                results.push({
                    success: data.success,
                    duration: duration,
                    error: data.success ? null : data.error
                });
                
                log('performanceResult', `✅ 测试 ${i + 1} 完成，耗时: ${duration}ms`, 'success');
                
            } catch (error) {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                results.push({
                    success: false,
                    duration: duration,
                    error: error.message
                });
                
                log('performanceResult', `❌ 测试 ${i + 1} 失败，耗时: ${duration}ms`, 'error');
            }
            
            // 更新进度条
            const progress = ((i + 1) / testCount) * 100;
            progressBar.style.width = progress + '%';
            
            // 延迟避免请求过频繁
            if (i < testCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // 统计结果
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
        const minDuration = Math.min(...results.map(r => r.duration));
        const maxDuration = Math.max(...results.map(r => r.duration));
        
        log('performanceResult', '📊 性能测试完成', 'success');
        log('performanceResult', `成功次数: ${successCount}/${testCount}`, 'info');
        log('performanceResult', `失败次数: ${failCount}/${testCount}`, 'info');
        log('performanceResult', `平均响应时间: ${avgDuration.toFixed(2)}ms`, 'info');
        log('performanceResult', `最快响应时间: ${minDuration}ms`, 'info');
        log('performanceResult', `最慢响应时间: ${maxDuration}ms`, 'info');
        
        testResults.performance = {
            success: true,
            testCount: testCount,
            successCount: successCount,
            failCount: failCount,
            avgDuration: avgDuration,
            minDuration: minDuration,
            maxDuration: maxDuration
        };
        
    } catch (error) {
        log('performanceResult', '❌ 性能测试失败：' + error.message, 'error');
        testResults.performance = { success: false, error: error.message };
    } finally {
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 2000);
    }
}

// 生成测试报告
function generateReport() {
    clearLog('summaryResult');
    
    log('summaryResult', '=== 百度OCR API测试报告 ===', 'success');
    log('summaryResult', `测试时间: ${new Date().toLocaleString()}`, 'info');
    log('summaryResult', '', 'info');
    
    // 网络连通性测试结果
    log('summaryResult', '1. 网络连通性测试:', 'info');
    if (testResults.network) {
        if (testResults.network.success) {
            log('summaryResult', '   ✅ 通过', 'success');
        } else {
            log('summaryResult', '   ❌ 失败: ' + testResults.network.error, 'error');
        }
    } else {
        log('summaryResult', '   ⏸️ 未执行', 'info');
    }
    
    // 访问令牌测试结果
    log('summaryResult', '2. 访问令牌获取测试:', 'info');
    log('summaryResult', '   前端直接调用:', 'info');
    if (testResults.tokenDirect) {
        if (testResults.tokenDirect.success) {
            log('summaryResult', '     ✅ 成功', 'success');
        } else {
            log('summaryResult', '     ❌ 失败: ' + testResults.tokenDirect.error, 'error');
        }
    } else {
        log('summaryResult', '     ⏸️ 未执行', 'info');
    }
    
    log('summaryResult', '   后端代理调用:', 'info');
    if (testResults.tokenProxy) {
        if (testResults.tokenProxy.success) {
            log('summaryResult', '     ✅ 成功', 'success');
        } else {
            log('summaryResult', '     ❌ 失败: ' + testResults.tokenProxy.error, 'error');
        }
    } else {
        log('summaryResult', '     ⏸️ 未执行', 'info');
    }
    
    // OCR识别测试结果
    log('summaryResult', '3. OCR识别测试:', 'info');
    log('summaryResult', '   前端直接调用:', 'info');
    if (testResults.ocrDirect) {
        if (testResults.ocrDirect.success) {
            log('summaryResult', '     ✅ 成功', 'success');
            if (testResults.ocrDirect.name) {
                log('summaryResult', `     识别姓名: ${testResults.ocrDirect.name}`, 'info');
            }
        } else {
            log('summaryResult', '     ❌ 失败: ' + testResults.ocrDirect.error, 'error');
        }
    } else {
        log('summaryResult', '     ⏸️ 未执行', 'info');
    }
    
    log('summaryResult', '   后端代理调用:', 'info');
    if (testResults.ocrProxy) {
        if (testResults.ocrProxy.success) {
            log('summaryResult', '     ✅ 成功', 'success');
            if (testResults.ocrProxy.name) {
                log('summaryResult', `     识别姓名: ${testResults.ocrProxy.name}`, 'info');
            }
            log('summaryResult', `     处理时间: ${testResults.ocrProxy.processingTime}ms`, 'info');
        } else {
            log('summaryResult', '     ❌ 失败: ' + testResults.ocrProxy.error, 'error');
        }
    } else {
        log('summaryResult', '     ⏸️ 未执行', 'info');
    }
    
    // 性能测试结果
    log('summaryResult', '4. 性能测试:', 'info');
    if (testResults.performance) {
        if (testResults.performance.success) {
            log('summaryResult', '     ✅ 完成', 'success');
            log('summaryResult', `     成功率: ${testResults.performance.successCount}/${testResults.performance.testCount}`, 'info');
            log('summaryResult', `     平均响应时间: ${testResults.performance.avgDuration.toFixed(2)}ms`, 'info');
        } else {
            log('summaryResult', '     ❌ 失败: ' + testResults.performance.error, 'error');
        }
    } else {
        log('summaryResult', '     ⏸️ 未执行', 'info');
    }
    
    // 推荐方案
    log('summaryResult', '', 'info');
    log('summaryResult', '=== 推荐方案 ===', 'success');
    
    if (testResults.tokenProxy && testResults.tokenProxy.success && 
        testResults.ocrProxy && testResults.ocrProxy.success) {
        log('summaryResult', '✅ 推荐使用后端代理方案', 'success');
        log('summaryResult', '原因：', 'info');
        log('summaryResult', '  - 避免CORS跨域问题', 'info');
        log('summaryResult', '  - API密钥安全存储', 'info');
        log('summaryResult', '  - 统一错误处理', 'info');
        log('summaryResult', '  - 可添加缓存和重试机制', 'info');
    } else if (testResults.tokenDirect && testResults.tokenDirect.success && 
               testResults.ocrDirect && testResults.ocrDirect.success) {
        log('summaryResult', '⚠️ 前端直接调用可行但不推荐', 'error');
        log('summaryResult', '问题：', 'info');
        log('summaryResult', '  - API密钥暴露风险', 'error');
        log('summaryResult', '  - 可能遇到CORS限制', 'error');
        log('summaryResult', '  - 网络环境依赖性强', 'error');
    } else {
        log('summaryResult', '❌ 需要排查具体问题', 'error');
        log('summaryResult', '建议检查：', 'info');
        log('summaryResult', '  - 网络连接状态', 'info');
        log('summaryResult', '  - API密钥配置', 'info');
        log('summaryResult', '  - 后端服务器状态', 'info');
    }
}

// 新功能：全面网络诊断
async function runNetworkDiagnosis() {
    clearLog('networkResult');
    log('networkResult', '🔍 开始全面网络诊断...');
    
    try {
        const response = await fetch('http://localhost:3002/api/network-diagnosis');
        
        if (!response.ok) {
            throw new Error(`网络诊断服务不可用: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 检查响应结构
        if (!result.success) {
            throw new Error(result.error || '网络诊断失败');
        }
        
        const diagnosis = result.data;
        
        // 检查诊断数据结构
        if (!diagnosis || !Array.isArray(diagnosis.tests)) {
            throw new Error('网络诊断数据格式错误');
        }
        
        log('networkResult', '📋 网络诊断报告:', 'info');
        log('networkResult', `诊断时间: ${new Date(diagnosis.timestamp).toLocaleString()}`);
        log('networkResult', `测试总数: ${diagnosis.summary.totalTests}, 成功: ${diagnosis.summary.passedTests}, 失败: ${diagnosis.summary.failedTests}`);
        
        // 显示各项测试结果
        log('networkResult', '\n🔍 详细测试结果:', 'info');
        diagnosis.tests.forEach((test, index) => {
            const status = test.success ? '✅' : '❌';
            const type = test.success ? 'success' : 'error';
            log('networkResult', `${status} ${test.name}: ${test.details}`, type);
            
            if (test.duration) {
                log('networkResult', `   耗时: ${test.duration}ms`);
            }
            
            if (test.recommendation) {
                log('networkResult', `   建议: ${test.recommendation}`, 'info');
            }
        });
        
        // 显示总结和建议
        if (diagnosis.summary.recommendations && diagnosis.summary.recommendations.length > 0) {
            log('networkResult', '\n🎯 解决建议:', 'info');
            diagnosis.summary.recommendations.forEach((rec, index) => {
                log('networkResult', `${index + 1}. ${rec}`, 'info');
            });
        }
        
        if (diagnosis.summary.success) {
            log('networkResult', '\n✨ 网络环境良好，可以直接使用百度OCR API', 'success');
        } else {
            log('networkResult', '\n⚠️ 网络环境受限，建议使用模拟数据进行功能测试', 'error');
        }
        
    } catch (error) {
        log('networkResult', '❌ 网络诊断失败：' + error.message, 'error');
        
        // 提供具体的故障排除建议
        if (error.message.includes('3002')) {
            log('networkResult', '请确保测试服务器已启动 (node test-server.js)', 'info');
        } else if (error.message.includes('数据格式')) {
            log('networkResult', '服务器返回数据格式异常，请检查服务器版本', 'info');
        } else {
            log('networkResult', '请检查控制台日志了解详细错误信息', 'info');
        }
    }
}

// 新功能：模拟OCR识别测试
async function testOCRMock() {
    const resultBox = document.getElementById('ocrResult');
    
    // 检查是否有图片文件（用于选择正面或背面）
    const fileInput = document.getElementById('imageFile');
    let idCardSide = 'front'; // 默认正面
    
    if (fileInput.files && fileInput.files[0]) {
        // 简单判断：如果文件名包含back或背面相关词汇，判断为背面
        const fileName = fileInput.files[0].name.toLowerCase();
        if (fileName.includes('back') || fileName.includes('背面') || fileName.includes('fan')) {
            idCardSide = 'back';
        }
    }
    
    clearLog('ocrResult');
    log('ocrResult', '🎭 开始模拟OCR识别测试...');
    log('ocrResult', `识别类型: ${idCardSide === 'front' ? '身份证正面' : '身份证背面'}`);
    
    try {
        // 准备模拟图片数据（简单的base64字符串）
        const mockImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const response = await fetch('http://localhost:3002/api/mock-ocr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: mockImageData,
                id_card_side: idCardSide
            })
        });
        
        if (!response.ok) {
            throw new Error(`模拟OCR请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            log('ocrResult', '✅ 模拟OCR识别成功', 'success');
            log('ocrResult', `处理时间: ${result.meta.processingTime.toFixed(0)}ms`);
            log('ocrResult', `识别字段数: ${result.data.words_result_num}`);
            
            // 显示识别的字段
            log('ocrResult', '\n📋 识别结果:');
            Object.entries(result.data.words_result).forEach(([key, value]) => {
                log('ocrResult', `${key}: ${value.words}`, 'info');
            });
            
            log('ocrResult', '\n💡 这是模拟数据，用于验证OCR功能逻辑', 'info');
            
            testResults.ocrMock = {
                success: true,
                side: idCardSide,
                fieldsCount: result.data.words_result_num,
                processingTime: result.meta.processingTime
            };
            
        } else {
            throw new Error(result.error || '模拟OCR识别失败');
        }
        
    } catch (error) {
        log('ocrResult', '❌ 模拟OCR测试失败：' + error.message, 'error');
        log('ocrResult', '请确保测试服务器已启动并支持mock-ocr端点', 'info');
        
        testResults.ocrMock = { success: false, error: error.message };
    }
}