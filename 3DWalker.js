let gl,
	canvas=document.getElementById('webgl'),
	fpsDiv=document.getElementById("fpsDiv"),
	viewProjMatrix = new Matrix4()
	;

let status={
	lightOn: false,
	locked: false,
	rotX: 0,
	rotY: 0
};

function main() {
	gl=assert(getWebGLContext(canvas, !false), 'Failed to get the rendering context for WebGL');

	let objProgram=assert(createProgram(gl, OBJECT_VSHADER_SRC, OBJECT_FSHADER_SRC), 'Failed to intialize shaders.');
	objProgram.a_Position = gl.getAttribLocation(objProgram, 'a_Position');
	objProgram.a_Normal = gl.getAttribLocation(objProgram, 'a_Normal');
	objProgram.a_Color = gl.getAttribLocation(objProgram, 'a_Color');
	objProgram.u_MvpMatrix = gl.getUniformLocation(objProgram, 'u_MvpMatrix');
	objProgram.u_NormalMatrix = gl.getUniformLocation(objProgram, 'u_NormalMatrix');
	objProgram.u_AmbientLight = gl.getUniformLocation(objProgram, 'u_AmbientLight');
	objProgram.u_LightDirection = gl.getUniformLocation(objProgram, 'u_LightDirection');
	objProgram.u_PointLightColor = gl.getUniformLocation(objProgram, 'u_PointLightColor');
	objProgram.u_PointLightPosition = gl.getUniformLocation(objProgram, 'u_PointLightPosition');
	if (objProgram.a_Position<0 || objProgram.a_Normal<0 || objProgram.a_Color<0 || objProgram.u_MvpMatrix<0 || objProgram.u_NormalMatrix<0 || objProgram.u_AmbientLight<0 || objProgram.u_LightDirection<0 || objProgram.u_PointLightColor<0 || objProgram.u_PointLightPosition<0)
		throw new Error("Failed to get location");

	let textureProgram=assert(createProgram(gl, TEXTURED_VSHADER_SRC, TEXTURED_FSHADER_SRC), 'Failed to intialize shaders.');
	textureProgram.a_Position = gl.getAttribLocation(textureProgram, 'a_Position');
	textureProgram.a_TexCoord = gl.getAttribLocation(textureProgram, 'a_TexCoord');
	textureProgram.u_MvpMatrix = gl.getUniformLocation(textureProgram, 'u_MvpMatrix');
	textureProgram.u_Sampler = gl.getUniformLocation(textureProgram, 'u_Sampler');
	if (textureProgram.a_Position<0 || textureProgram.a_TexCoord<0 || textureProgram.u_MvpMatrix<0 || textureProgram.u_Sampler<0)
		throw new Error("Failed to get location");

	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	for (let obj of ObjectList){
		obj.objdoc=null;
		if (obj.color.length==3) obj.color.push(1);
		obj.model=assert(initVertexBuffers(gl, objProgram), 'Failed to set the vertex information');
		readOBJFile(obj.objFilePath, obj, 1, true);
	}

	floorRes.texture=initTexture(gl, textureProgram, floorRes.texImagePath);
	floorRes=initAndFeedTextureObjBuffers(gl, floorRes);
	boxRes.texture=initTexture(gl, textureProgram, boxRes.texImagePath);
	boxRes=initAndFeedTextureObjBuffers(gl, boxRes);

	let currentAngle = 0.0; // Current rotation angle [degree]
	let tick = function() {   // Start drawing
		viewProjMatrix.setPerspective(CameraPara.fov, canvas.width/canvas.height, CameraPara.near, CameraPara.far);
		viewProjMatrix.rotate(status.rotX, 0, 1, 0);
		viewProjMatrix.rotate(status.rotY, 1, 0, 0);
		viewProjMatrix.lookAt(
			CameraPara.eye[0], CameraPara.eye[1], CameraPara.eye[2],
			CameraPara.at[0],  CameraPara.at[1],  CameraPara.at[2],
			CameraPara.up[0],  CameraPara.up[1],  CameraPara.up[2]
		);

		currentAngle = animate(currentAngle); // Update current rotation angle
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  // Clear color and depth buffers
		gl.enable(gl.DEPTH_TEST);

		gl.useProgram(objProgram);
		for (let obj of ObjectList) {
			if (obj.objFilePath.includes('gumby'))
				drawObj(gl, objProgram, currentAngle, viewProjMatrix, obj);
			else
				drawObj(gl, objProgram, 0, viewProjMatrix, obj);
		}

		gl.useProgram(textureProgram);
		drawTextureObj(gl, textureProgram, floorRes);
		drawTextureObj(gl, textureProgram, boxRes);

		requestAnimationFrame(tick);
	};
	tick();

	canvas.addEventListener('click', function(){canvas.requestPointerLock();}, false);
	canvas.addEventListener('mousemove', mouseMoveHandler, false);
	document.addEventListener('pointerlockchange', pointerLockHandler, false);
	document.onkeydown=keyDownHandler;
}

function initVertexBuffers(gl, program) {
	let o = {}; // Utilize Object object to return multiple buffer objects
	o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT);
	o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
	o.colorBuffer = createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT);
	o.indexBuffer = gl.createBuffer();
	if (!o.vertexBuffer || !o.normalBuffer || !o.colorBuffer || !o.indexBuffer) { return null; }

	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return o;
}

// Create a buffer object, assign it to attribute variables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
	var buffer =  gl.createBuffer();  // Create a buffer object
	if (!buffer) {
		console.log('Failed to create the buffer object');
		return null;
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);  // Assign the buffer object to the attribute variable
	gl.enableVertexAttribArray(a_attribute);  // Enable the assignment
	buffer.num = num;
	buffer.type = type;
	return buffer;
}

function assert(x, errmsg){
	if (!x) throw new Error(errmsg);
	return x;
}

// Read a file
function readOBJFile(fileName, obj, scale, reverse) {
	var request = new XMLHttpRequest();

	request.onreadystatechange = function() {
		if (request.readyState === 4 && request.status !== 404) {
			onReadOBJFile(request.responseText, fileName, obj, scale, reverse);
		}
	}
	request.open('GET', fileName, true); // Create a request to acquire the file
	request.send();                      // Send the request
}

var drawingInfo = null; // The information for drawing 3D model

// OBJ File has been read
function onReadOBJFile(fileString, fileName, obj, scale, reverse) {
	var objDoc = new OBJDoc(fileName);  // Create a OBJDoc object
	objDoc.defaultColor = obj.color;
	var result = objDoc.parse(fileString, scale, reverse); // Parse the file
	if (!result) {
		obj.objdoc = null; drawingInfo = null;
		console.log("OBJ file parsing error.");
		return;
	}
	obj.objdoc = objDoc;
}

// Coordinate transformation matrix
let g_modelMatrix = new Matrix4();
let g_mvpMatrix = new Matrix4();
let g_normalMatrix = new Matrix4();

// 描画関数
function drawObj(gl, objProgram, angle, viewProjMatrix, obj) {
	if (obj.objdoc != null && obj.objdoc.isMTLComplete()){ // OBJ and all MTLs are available
		drawingInfo = onReadComplete(gl, obj.model, obj.objdoc);
	}
	if (!drawingInfo) return;   // モデルを読み込み済みか判定

	let lightDirection = new Vector3(sceneDirectionLight);
	lightDirection.normalize();
	gl.uniform3fv(objProgram.u_LightDirection, lightDirection.elements);
	gl.uniform3fv(objProgram.u_AmbientLight, new Float32Array(sceneAmbientLight));
	gl.uniform3f(objProgram.u_PointLightPosition, CameraPara.eye[0], CameraPara.eye[1], CameraPara.eye[2]);
	if (status.lightOn) gl.uniform3f(objProgram.u_PointLightColor, 0.2, 0.2, 0.2);
	else gl.uniform3f(objProgram.u_PointLightColor, 0,0,0);

	g_modelMatrix.setIdentity();
	g_modelMatrix.setRotate(angle, 0.0, 1.0, 0.0); // 適当に回転

	for (let entry of obj.transform) {
		if (entry.type == 'translate')
			g_modelMatrix.translate(entry.content[0], entry.content[1], entry.content[2]);
		else if (entry.type == 'rotate')
			g_modelMatrix.rotate(entry.content[0], entry.content[1], entry.content[2], entry.content[3]);
		else if (entry.type == 'scale')
			g_modelMatrix.scale(entry.content[0], entry.content[1], entry.content[2]);
	}
	gl.uniformMatrix4fv(objProgram.u_ModelMatrix, false, g_modelMatrix.elements);

	// Calculate the normal transformation matrix and pass it to u_NormalMatrix
	g_normalMatrix.setInverseOf(g_modelMatrix);
	g_normalMatrix.transpose();
	gl.uniformMatrix4fv(objProgram.u_NormalMatrix, false, g_normalMatrix.elements);

	// Calculate the model view project matrix and pass it to u_MvpMatrix
	g_mvpMatrix.set(viewProjMatrix).multiply(g_modelMatrix);
	gl.uniformMatrix4fv(objProgram.u_MvpMatrix, false, g_mvpMatrix.elements);

	initAttributeVariable(gl, objProgram.a_Position, obj.model.vertexBuffer);
	initAttributeVariable(gl, objProgram.a_Normal, obj.model.normalBuffer);
	initAttributeVariable(gl, objProgram.a_Color, obj.model.colorBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.model.indexBuffer);

	//console.log(obj.objFilePath);
	gl.drawElements(gl.TRIANGLES, drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
}

// OBJ File has been read compreatly
function onReadComplete(gl, model, objDoc) {
	// Acquire the vertex coordinates and colors from OBJ file
	var drawingInfo = objDoc.getDrawingInfo();

	// Write date into the buffer object
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

	// Write the indices to the buffer object
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

	return drawingInfo;
}

var ANGLE_STEP = 30;   // The increments of rotation angle (degrees)

var last = Date.now(); // Last time that this function was called
function animate(angle) {
	var now = Date.now();   // Calculate the elapsed time
	var elapsed = now - last;
	last = now;
	// Update the current rotation angle (adjusted by the elapsed time)
	var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
	return newAngle % 360;
}

function initAttributeVariable(gl, attribPtr, buffer) {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.vertexAttribPointer(attribPtr, buffer.num, buffer.type, false, 0, 0);
	gl.enableVertexAttribArray(attribPtr);
}

function initTexture(gl, program, imageUrl) {
	var texture = gl.createTexture();   // Create a texture object
	if (!texture) {
		console.log('Failed to create the texture object');
		return null;
	}

	var image = new Image();  // Create a image object
	if (!image) {
		console.log('Failed to create the image object');
		return null;
	}
	// Register the event handler to be called when image loading is completed
	image.onload = function() {
		// Write the image data to texture object
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

		// Pass the texure unit 0 to u_Sampler
		gl.useProgram(program);
		gl.uniform1i(program.u_Sampler, 0);

		gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture
	};

	image.src = imageUrl;

	return texture;
}

function initAndFeedTextureObjBuffers(gl, texObj){
	texObj.vertexBuffer = assert(gl.createBuffer(), 'Failed to create the buffer object');
	gl.bindBuffer(gl.ARRAY_BUFFER, texObj.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texObj.vertex), gl.STATIC_DRAW);
	texObj.vertexBuffer.type=gl.FLOAT;
	texObj.vertexBuffer.num=3;

	texObj.texCoordBuffer = assert(gl.createBuffer(), 'Failed to create the buffer object');
	gl.bindBuffer(gl.ARRAY_BUFFER, texObj.texCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texObj.texCoord), gl.STATIC_DRAW);
	texObj.texCoordBuffer.type=gl.FLOAT;
	texObj.texCoordBuffer.num=2;

	let uint8IndexArr = new Uint8Array(texObj.index);
	texObj.indexBuffer = assert(gl.createBuffer(), 'Failed to create the buffer object');
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, texObj.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, uint8IndexArr, gl.STATIC_DRAW);
	texObj.indexBuffer.type=gl.UNSIGNED_BYTE;

	if (!texObj.vertexBuffer || !texObj.texCoordBuffer || !texObj.indexBuffer) return null;
	texObj.numIndices = uint8IndexArr.length;

	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	return texObj;
}

function drawTextureObj(gl, texProgram, obj){
	let modelMatrix=new Matrix4(), mvpMatrix=new Matrix4();
	modelMatrix.setTranslate(obj.translate[0], obj.translate[1], obj.translate[2]);
	modelMatrix.scale(obj.scale[0], obj.scale[1], obj.scale[2]);

	mvpMatrix.set(viewProjMatrix).multiply(modelMatrix);
	gl.uniformMatrix4fv(texProgram.u_MvpMatrix, false, mvpMatrix.elements);

	initAttributeVariable(gl, texProgram.a_Position, obj.vertexBuffer);
	initAttributeVariable(gl, texProgram.a_TexCoord, obj.texCoordBuffer);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, obj.texture);
	gl.uniform1i(texProgram.u_Sampler, 0);
	gl.drawElements(gl.TRIANGLES, obj.numIndices, obj.indexBuffer.type, 0);
}

function mouseMoveHandler(ev) {
	if (status.locked) {
		status.rotX += ev.movementX*0.2;
		status.rotY += ev.movementY*0.2;
		if (status.rotX<-360 || status.rotX>360) status.rotX%=360;
		if (status.rotY<-85) status.rotY=-85;
		if (status.rotY>85) status.rotY=85;
		console.log(status.rotX+' '+status.rotY);
	}
}

function keyDownHandler(ev) {
	let keycodeChar=String.fromCharCode(ev.keyCode);
	let elps=20;
	switch (keycodeChar){
		case 'W':
			CameraPara.eye[2]-=MOVE_VELOCITY*elps/1000;
			CameraPara.at[2]-=MOVE_VELOCITY*elps/1000*MOVE_VELOCITY;
			break;
		case 'A':
			CameraPara.eye[0]-=MOVE_VELOCITY*elps/1000;
			CameraPara.at[0]-=MOVE_VELOCITY*elps/1000;
			break;
		case 'S':
			CameraPara.eye[2]+=MOVE_VELOCITY*elps/1000;
			CameraPara.at[2]+=MOVE_VELOCITY*elps/1000;
			break;
		case 'D':
			CameraPara.eye[0]+=MOVE_VELOCITY*elps/1000;
			CameraPara.at[0]+=MOVE_VELOCITY*elps/1000;
			break;
		case 'F':
			status.lightOn=!status.lightOn;
			break;
	}
}

function pointerLockHandler(ev) {
	status.locked=true;
}