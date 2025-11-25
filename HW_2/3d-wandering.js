var canvas;
var gl;
var program;

var vBuffer, cBuffer;//顶点属性数组

// 交互可调参数及根据参数生成的三个变换：M,V,P（全局变量）
var modelScale; //物体整体缩放的因子
var theta; // 视点（眼睛）绕Y轴旋转角度，参极坐标θ值，
var phi; // 视点（眼睛）绕X轴旋转角度，参极坐标φ值，
var isOrth; // 投影方式设置参数
var fov; // 透视投影的俯仰角，fov越大视野范围越大
var ModelMatrix; // 模型变换矩阵
var ViewMatrix; // 视图变换矩阵
var ProjectionMatrix; // 投影变换矩阵

// 新增：物体运动参数
var objectPosition = [0, 0, 0]; // 物体位置 [x, y, z]
var objectRotation = [0, 0, 0]; // 物体旋转 [x, y, z]
var moveSpeed = 0.1; // 移动速度
var rotateSpeed = 5; // 旋转速度

// shader里的统一变量在本代码里的标识变量
var u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
var u_Flag;//用来区分绘制坐标还是物体，坐标轴不需要进行M变换

// 新增：鼠标交互变量
var isMouseDown = false;
var lastMouseX = 0;
var lastMouseY = 0;

/* ***********窗口加载时调用:程序环境初始化程序****************** */
window.onload = function() {
    canvas = document.getElementById("canvas");
    gl = canvas.getContext('webgl2');
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    program = initShaders( gl, "shaders/3d-wandering.vert", "shaders/3d-wandering.frag" );
    gl.useProgram( program );
    
	//调整画布大小为正方形以保证图形长宽比例正确,设置视口viewport大小与画布一致
    resize();
	
	// 开启深度缓存，以正确渲染物体被遮挡部分，3D显示必备
    gl.enable(gl.DEPTH_TEST); 
	// 设置canvas画布背景色 -白色-
    gl.clearColor(1.0, 1.0, 1.0, 1.0); 
	
	
    // 初始化数据缓冲区，并关联attribute 着色器变量
    vBuffer = gl.createBuffer();//为points存储的缓存
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );  	
    cBuffer = gl.createBuffer();//为colors存储的缓存
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
		
	// 关联uniform着色器变量
    u_ModelMatrix = gl.getUniformLocation(program,"u_ModelMatrix");
    u_ViewMatrix = gl.getUniformLocation( program, "u_ViewMatrix" );
    u_ProjectionMatrix = gl.getUniformLocation( program, "u_ProjectionMatrix" );
    u_Flag = gl.getUniformLocation(program, "u_Flag");

	//初始化交互界面上的相关参数
	initViewingParameters();
	
    // 生成XYZ坐标轴，调用models-data.js中函数//返回points和colors数组 
    vertextsXYZ(); 	
	// 生成立方体模型数据，调用models-data.js中函数//返回points和colors数组 
    generateCube(); 
	
    // 发送顶点属性数据points和colors给GPU
    SendData(); 	
    // 调用绘制函数进行渲染
    render(); 
    
    // 注册鼠标事件
    setupMouseEvents();
}

/* 设置鼠标事件 */
function setupMouseEvents() {
    canvas.addEventListener('mousedown', function(e) {
        isMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mouseup', function() {
        isMouseDown = false;
        canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('mousemove', function(e) {
        if (!isMouseDown) return;
        
        var deltaX = e.clientX - lastMouseX;
        var deltaY = e.clientY - lastMouseY;
        
        // 鼠标水平移动控制绕Y轴旋转
        theta += deltaX * 0.5;
        // 鼠标垂直移动控制绕X轴旋转
        phi += deltaY * 0.5;
        
        // 限制phi的角度范围，避免翻转
        phi = Math.max(1, Math.min(179, phi));
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        render();
    });

    canvas.addEventListener('mouseleave', function() {
        isMouseDown = false;
        canvas.style.cursor = 'default';
    });

    // 初始光标样式
    canvas.style.cursor = 'grab';
}

/* 注册键盘按键事件 */
window.onkeydown = function(e){
    var key = e.key;
    
    // 1234控制物体运动
    switch(key) {
        case '1': // 向前移动
            objectPosition[2] -= moveSpeed;
            break;
        case '2': // 向后移动
            objectPosition[2] += moveSpeed;
            break;
        case '3': // 向左移动
            objectPosition[0] -= moveSpeed;
            break;
        case '4': // 向右移动
            objectPosition[0] += moveSpeed;
            break;
        case '5': // 向上移动
            objectPosition[1] += moveSpeed;
            break;
        case '6': // 向下移动
            objectPosition[1] -= moveSpeed;
            break;
        case 'q': // 绕X轴旋转
            objectRotation[0] += rotateSpeed;
            break;
        case 'w': // 绕Y轴旋转
            objectRotation[1] += rotateSpeed;
            break;
        case 'e': // 绕Z轴旋转
            objectRotation[2] += rotateSpeed;
            break;
    }

    // 原有功能
    switch (e.keyCode) { 
		case 90:    // Z-模型放大
            modelScale *= 1.1;
            break;
        case 67:    // C-模型缩小
            modelScale *= 0.9;
            break;
                
        case 80:    // P-切换投影方式
            isOrth = !isOrth;
            break;
        case 77:    // M-放大俯仰角
            fov = Math.min(fov + 5, 170);
            break;
        case 78:    // N-较小俯仰角
            fov = Math.max(fov - 5, 5);
            break; 			
			
		case 32:    // 空格-复位
            initViewingParameters();
            break;
    
        // 消隐设置
        case 82: // R -开启后向面剔除
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
            console.log("开启后向面剔除");
            break;
        case 84: // T- 关闭后向面剔除
            gl.disable(gl.CULL_FACE);
            console.log("关闭后向面剔除");
            break;

        case 66: // B-开启深度缓存
            gl.enable(gl.DEPTH_TEST);
            console.log("开启深度缓存消隐算法");
            break;
        case 86: // V-关闭深度缓存
            gl.disable(gl.DEPTH_TEST);
            console.log("关闭深度缓存消隐算法");
            break;
    }        
    render();//参数变化后需要重新绘制画面
}

/* 绘图界面随窗口交互缩放而相应变化，保持1:1防止图形变形 */
window.onresize = resize;
function resize(){
    var size = Math.min(document.body.clientWidth, document.body.clientHeight);
    canvas.width = size;
    canvas.height = size;
    gl.viewport( 0, 0, canvas.width, canvas.height );
    render();
}


/* ****************************************
*  渲染函数render 
*******************************************/
function render(){    
    // 用背景色清屏
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    
    // 构造观察流程中需要的三各变换矩阵
    ModelMatrix = formModelMatrix();//M:模型变换矩阵
    ViewMatrix = formViewMatrix(); //V:视点变换矩阵
    ProjectionMatrix = formProjectMatrix(); //投影变换矩阵
    
    // 传递变换矩阵    
    gl.uniformMatrix4fv( u_ModelMatrix, false, flatten(ModelMatrix) );     
    gl.uniformMatrix4fv( u_ViewMatrix, false, flatten(ViewMatrix) ); 
    gl.uniformMatrix4fv( u_ProjectionMatrix, false, flatten(ProjectionMatrix) ); 
	
    // 标志位设为0，用顶点数据绘制坐标系
    gl.uniform1i( u_Flag, 0 );
    gl.drawArrays( gl.LINES, 0, 6 ); // 绘制X轴，从0开始，读6个点
    gl.drawArrays( gl.LINES, 6, 6 ); // 绘制y轴，从6开始，读6个点
    gl.drawArrays( gl.LINES, 12, 6 ); // 绘制z轴，从12开始，读6个点        

    // 标志位设为1，用顶点数据绘制 面单色立方体
    gl.uniform1i( u_Flag, 1 );
    gl.drawArrays( gl.TRIANGLES, 18, points.length - 18 ); // 绘制物体,都是三角形网格表面
}


/* ****************************************************
* 初始化或复位：需要将交互参数及变换矩阵设置为初始值
********************************************************/
function initViewingParameters(){
	modelScale = 1.0;		
    theta = 0;     
	phi = 90;	
    isOrth = true;     
	fov = 120;
	
	// 重置物体位置和旋转
	objectPosition = [0, 0, 0];
	objectRotation = [0, 0, 0];
	
	ModelMatrix = mat4(); //单位矩阵
    ViewMatrix = mat4();//单位矩阵
    ProjectionMatrix = mat4();//单位矩阵
};


/* ****************************************************
 * 生成观察流水管线中的 M,V,P矩阵  
********************************************************/
function formModelMatrix(){
    // 创建缩放矩阵
    var scaleMatrix = scale(modelScale, modelScale, modelScale);
    
    // 创建旋转矩阵（绕X、Y、Z轴）
    var rotateXMatrix = rotateX(objectRotation[0]);
    var rotateYMatrix = rotateY(objectRotation[1]);
    var rotateZMatrix = rotateZ(objectRotation[2]);
    
    // 创建平移矩阵
    var translateMatrix = translate(objectPosition[0], objectPosition[1], objectPosition[2]);
    
    // 组合变换：先缩放，再旋转，最后平移
    var modelMatrix = mult(translateMatrix, mult(rotateYMatrix, mult(rotateXMatrix, mult(rotateZMatrix, scaleMatrix))));
    
    return modelMatrix;
}

function formViewMatrix(){
    var radius = 3.0; 
    const at = vec3(0.0, 0.0, 0.0);
    
    // 将球坐标转换为笛卡尔坐标
    var thetaRad = radians(theta);
    var phiRad = radians(phi);
    
    var eye = vec3(
        radius * Math.sin(phiRad) * Math.sin(thetaRad),
        radius * Math.cos(phiRad),
        radius * Math.sin(phiRad) * Math.cos(thetaRad)
    );
    
    var up = vec3(0.0, 1.0, 0.0);
    
    // 当视线方向接近Y轴时，调整up向量以避免万向节锁
    if(Math.abs(phi) < 10 || Math.abs(phi) > 170) {
        up = vec3(0.0, 0.0, 1.0);
    }

    return lookAt(eye, at, up);
};

function formProjectMatrix(){
    const near = 0.1;
    const far = 100.0;
    const aspect = canvas.width / canvas.height;
    
    if(isOrth){
        // 正交投影，根据aspect调整宽度或高度
        var right = 2.0;
        var left = -right;
        var top = right / aspect;
        var bottom = -top;
        return ortho(left, right, bottom, top, near, far);
    } else {
        return perspective(fov, aspect, near, far);
    }
}

/****************************************************************
* 初始及交互菜单选择不同图形后，需要重新发送顶点属性数据给GPU
******************************************************************/
function SendData(){
    var pointsData = flatten(points);
    var colorsData = flatten(colors);

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, pointsData, gl.STATIC_DRAW );
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, colorsData, gl.STATIC_DRAW );
}

/********************************************************
* 交互菜单选择不同图形后，需要重新生成顶点数据并渲染
******************************************************/
function modelChange(model){
    points = [];
    colors = [];
    switch(model){
        case 'cube':{
            vertextsXYZ();
            generateCube();
            break;
        }
        case 'sphere':{
            vertextsXYZ();
            generateSphere();
            break;
        }
        case 'hat':{
            vertextsXYZ();
            generateHat();
            break;
        }
    }
    SendData();//重新发送数据
	render();//重新渲染
}

// 添加动画循环以持续渲染
function animate() {
    render();
    requestAnimationFrame(animate);
}

// 启动动画循环
animate();