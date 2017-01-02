
let gl,
	canvas=document.getElementById('webgl'),
	fpsDiv=document.getElementById("fpsDiv"),
	g_last=Date.now(),
	showBorder=true,
	editing=true,
	animating=false,
	draggingVertexId=null;

function main() {

}

function updateAttitude(attitude) {
	let lastDate=g_last;
	g_last=Date.now();
	attitude.angle=(attitude.angle+ANGLE_STEP*(g_last-lastDate)/1000.0)%360;
	attitude.scaleLoop=(attitude.scaleLoop+(g_last-lastDate)/1000.0*SCALE_LOOP_STEP)%2.0;
	attitude.scale=Math.abs(attitude.scaleLoop-1)*(SCALE_MAX-SCALE_MIN)+SCALE_MIN;
}

function keyDownHandler(ev) {
	let keycodeChar=String.fromCharCode(ev.keyCode);
	switch (keycodeChar){
		case 'T':
			editing=false;
			animating=!animating;
			if (animating) g_last=Date.now();
			animate();
			break;
		case 'E':
			editing=true;
			animating=false;
			drawQuadrangles(gl, polygon, 0, 1, showBorder);
			break;
		case 'B':
			showBorder=!showBorder;
			if (editing) drawQuadrangles(gl, polygon, 0, 1, showBorder);
			else drawQuadrangles(gl, polygon, attitude.angle, attitude.scale, showBorder);
			break;
	}
}

// redraw if mouse moving and pressed
function mouseMoveHandler(event) {
	if (!draggingVertexId) return;
	let pos = getMousePosition(event.clientX, event.clientY);
	draggingVertexId[0] = parseInt(pos.x);
	draggingVertexId[1] = parseInt(pos.y);
	drawQuadrangles(gl, polygon, 0, 1, showBorder);
}

function getMousePosition(in_x, in_y) {
	var canvasRect = canvas.getBoundingClientRect();
	return {
		x: in_x - canvasRect.left * (canvas.width / canvasRect.width),
		y: in_y - canvasRect.top * (canvas.height / canvasRect.height)
	};
}