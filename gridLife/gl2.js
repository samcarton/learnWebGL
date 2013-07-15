// gridLife2.js
// Extending the simple game of life (gridLife1) with some 3D cubes and shadow maps.
// By Sam Carton, 15 July 2013
// http://SamCarton.com

// Timers
var lastTime, activateTimer, tickTime, tick, running;

// Grid vars
var gridHeight, gridWidth, cellSize, grid, bgPlane, bgPlane2;
var color1, color2, bgColor, twoTone, colorFunc;

// Rendering vars
var renderer, camera, controls, scene;

// starting condition var
var randActivation;

//focus tracking var
var wasRunning;

init();
setSeed();
animate();

function init() {
	// init timers
	lastTime = new Date().getTime();
	activateTimer = 0;
	tickTime = 250;
	tick = 0;
	running = false;
	
	// initial rand activation
	randActivation = 0.2;
	
	//focus tracking
	wasRunning = false;
	
	//set grid params
	gridHeight = 40;
	gridWidth = 40;
	cellSize = 20;
	color1 = 0x880000;
	color2 = 0xFF9900;
	twoTone = true;
	
	// Renderer
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMapEnabled = true;
	renderer.shadowMapType = THREE.PCFShadowMap;
	// append renderer to DOM
	document.body.appendChild(renderer.domElement);
	
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 700;
	camera.position.x = gridWidth*cellSize/2;
	camera.position.y = gridHeight*cellSize/2;

	// controls
	controls = new THREE.OrbitControls(camera);
	controls.maxDistance = 5000;
	controls.userPan = false;
	controls.center = new THREE.Vector3( gridWidth*cellSize/2, gridHeight*cellSize/2, 0);
	
	// new scene to hold everything
	scene = new THREE.Scene();
	
	// lights
	scene.add(new THREE.AmbientLight(0x505050));
	var light = new THREE.SpotLight(0xffffff, 3);
	light.position.set(gridWidth*cellSize*1.5,gridHeight*cellSize*1.5,500);

	light.castShadow = true;
	light.shadowCameraNear = 100;
	light.shadowCameraFar = camera.far;
	light.shadowCameraFov = 60;

	light.shadowBias = -0.00022;
	light.shadowDarkness = 0.5;

	light.shadowMapWidth = 2048;
	light.shadowMapHeight = 2048;

	scene.add( light );
	
	/////////////////
	// make the grid
	/////////////////	
	
	grid = new Array(gridWidth);
	for(var i = 0; i< gridWidth; i++)
	{
		grid[i] = new Array(gridHeight);
	}

	//populate grid
	var gridLength = gridHeight*gridWidth;
	var x = 0, y = 0;
	var black = true; // for alternating colour 
	var geom = new THREE.CubeGeometry(cellSize,cellSize,cellSize);
	for(var i = 0; i<gridLength;i++)
	{
		if (black)
		{
			col = color2;
			black = false;
		}
		else
		{
			col = color1;
			black = true;
		}
		// create a new plane mesh for this cell, using the given color for the material
		grid[x][y] = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({color:col}));
		grid[x][y].material.ambient = grid[x][y].material.color;
		grid[x][y].position.x = x*cellSize+cellSize/2;
		grid[x][y].position.y = y*cellSize+cellSize/2;	
		grid[x][y].visible = false;
		grid[x][y].castShadow = true;
		grid[x][y].receiveShadow = true;
		grid[x][y].gridColorBlack = black;
		
		// add the cell mesh to the grid
		scene.add(grid[x][y]);
		x++;
		
		// end of a row (could use a nested for loop)
		if(x == gridWidth)
		{
			x = 0;
			y++;
			
			//if even, swap colors again to get checkerboard effect
			if(gridWidth%2 == 0)
			{
				black = !black;
			}
		}		
	}
	
		
	// Background plane
	bgColor = 0xEEEEEE;
	var planeGeom = new THREE.PlaneGeometry(cellSize*gridWidth,cellSize*gridHeight);
	bgPlane = new THREE.Mesh(
		planeGeom,
		//new THREE.CubeGeometry(cellSize*gridWidth, cellSize*gridHeight, 2),
		new THREE.MeshLambertMaterial({
			color:bgColor}));
	//bgPlane.material.ambient = bgColor;
	bgPlane.castShadow = false;
	bgPlane.receiveShadow = true;
	bgPlane.position.x = cellSize*gridWidth/2;
	bgPlane.position.y = cellSize*gridHeight/2;
	bgPlane.position.z = -(cellSize/2 +1);
	scene.add(bgPlane);

	// second bg plane to mask the back of the first
	var bgColor2 = 0x333333;
	bgPlane2 = new THREE.Mesh(
		planeGeom,
		new THREE.MeshBasicMaterial({
			color:bgColor2}));
	bgPlane2.position.x = cellSize*gridWidth/2;
	bgPlane2.position.y = cellSize*gridHeight/2;
	bgPlane2.position.z = -(cellSize/2 +2);
	bgPlane2.material.side = THREE.DoubleSide;
	scene.add(bgPlane2);
	
	
	////////////
	// Info Box
	////////////

	var info = document.createElement( 'div' );
	info.style.position = 'absolute';
	info.style.top = '10px';
	info.style.left = '10px';
	info.style.background = 'rgba(0,0,0,0.2)';
	info.style.padding = '10px';
	info.innerHTML = '<h1 style="margin:0px;color:#FFFFFF">Grid Life 02</h1><p><a href="http://samcarton.com">by Sam Carton</a></p>';
	container.appendChild( info );


	/////////
	// GUI
	/////////
	var gui = new dat.GUI();
	gui.add(this, 'randActivation',0,1);
	gui.add(this, 'tickTime',100,2000).step(50);
	gui.add(this, 'setParams');
	gui.add(this, 'manualAdvance');
	gui.add(this, 'start');
	gui.add(this, 'stop');
	gui.add(this, 'tick').listen();
	
	// color folder for the gui
	var colorFolder = gui.addFolder('Colors');
	var guiCol1 = colorFolder.addColor(this, 'color1');
	var guiCol2 = colorFolder.addColor(this, 'color2');
	var guiTwoTone = colorFolder.add(this, 'twoTone');
	var guiBGCol = colorFolder.addColor(this,'bgColor');
	
	// functions to call when color value is changed through gui
	guiCol1.onChange(function(value){colorFunc(value,true);} );
	
	guiCol2.onChange(function(value){colorFunc(value,false);} );
	
	guiTwoTone.onChange(function(value){
		twoTone = value;
		colorFunc(color1,true);
		colorFunc(color2,false);
	});
	
	guiBGCol.onChange(function(value){
		bgPlane.material.color.set(value);
	});
	
}

// Grid color change function. blackValue indicates whether the incoming
// value is the "black" tile color or not.
colorFunc = function changeGridColor(value, blackValue) {	
	var x = 0; 
	var y = 0;
	// if it is constant color, and the secondary color is changed,
	// no need to iterate through the grid - nothing should change.
	if(!twoTone && !blackValue)
	{
		return;
	}
	
	for(var i = 0; i< gridHeight*gridWidth; i++)
	{	
		if(twoTone)
		{
			if(grid[x][y].gridColorBlack == blackValue)
			{
				grid[x][y].material.color.set(value);				
			}
		}
		else
		{	
			grid[x][y].material.color.set(value);			
		}
		
		x++;
		if(x == gridWidth)
		{
			x = 0;
			y++;
		}
		
	}
}

// Set initial conditions of the grid
function setSeed(){
	var x = 0;
	var y = 0;
	for(var i = 0; i< gridHeight*gridWidth; i++)
	{		
		// randomly make cells alive based on 'randActivation'
		if(Math.random() < randActivation)
		{
			grid[x][y].visible = true;
		}
		else
		{
			//ensure set to false otherwise
			grid[x][y].visible = false;
		}
		x++;
		if(x == gridWidth)
		{
			x = 0;
			y++;
		}
	}
	
}

// Set parameters from gui input
// stops simulation if it is running.
function setParams(){
	stop();			
	tick = 0;	
	
	// set the grid
	setSeed();		
}


// Start the simulation
function start(){	
	running = true;
}

// Stop the simulation
function stop(){
	running = false;
}

// Advance the simulation by one tick/generation
function advanceGeneration(){
	tick++;
	
	// prepare the action queue
	var aQ = [];
	
	// count neighbours, fill action queue
	countNeighbours(grid,aQ);
	
	// execute action queue to generate next generation
	executeActions(grid,aQ);	
}

// Manually advance the simulation by a single tick.
// This is called by a HTML button:
// <button onclick="manualAdvance()">Increment Tick</button>
// First checks if the simulation has been stopped, then advances.
function manualAdvance(){
	if(!running)
	{
		advanceGeneration();
	}
}

// Animation loop executed by three.js
function animate(){
	//update delta time
	var time = new Date().getTime();	
	var dT = time - lastTime;	
	//update activation timer
	if(running)
	{
		activateTimer += dT;
		
		// loop counter to stop spiral of death
		var loop = 0;
		var maxLoop = 3;
		while(activateTimer > tickTime && loop < maxLoop)
		{			
			loop++;
			activateTimer = activateTimer - tickTime;
			advanceGeneration();			
		}
	}
	// keep time for next loop
	lastTime = time;
	
	//update controls
	controls.update();
	
	//render scene
	renderer.render(scene, camera);
	
	//request new frame
	requestAnimationFrame(function(){
		animate();
	});	
}



// Set the resize function for window resize events.
window.addEventListener( 'resize', onWindowResize, false);

function onWindowResize(){	
	// update with new aspect
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}

// stop ticking when tab/window focus lost
window.onblur = function() 
{
	if(running)
	{
		wasRunning = true;
		running = false;
	}
	else
	{
		wasRunning = false;
	}	
	
}

// if tab/window gains focus again, and it was running previouisly, restart it.
window.onfocus = function()
{
	if(wasRunning)
	{
		running = true;
	}
	lastTime = new Date().getTime();
}


////////
// LIFE
////////

////////
// RULES
// 1. Live cell < 2 live neighbours, dies
// 2. Live cell 2 || 3 live neighbours, lives
// 3. Live cell > 3 live neighbours, dies
// 4. Dead cell, == 3 neighbours, becomes alive.

// Action Constructor
// Action codes:
// 	false - set cell to dead next generation
// 	true - set cell to alive next generation
function action(xIndex, yIndex, actionCode)
{
	this.xIndex = xIndex;
	this.yIndex = yIndex;
	this.actionCode = actionCode;
}

// Life Steps:
// -Render
// -Count up live neighbours for each cell.
// -For each cell add to action queue based on rules.
// -Execute action queue (use stack.pop() for faster execution, order does not matter)

// Modulo
// % operator in JS uses truncated division, which is not helpful for our wrap-around.
// Thus the following modulo function is used to effect the grid wrap-around.
// Floored division modulo, as described by Knuth, Donald. E. (1972) in The Art of Computer Programming. Addison-Wesley.
function modulo(x, y) {	
	return(x-y*Math.floor(x/y));
}

// Count neighbours and add to action queue based on rules
function countNeighbours(gridParam, actionQ)
{
	for(var i = 0; i < gridParam.length; i++)
	{
		for(var j = 0; j< gridParam[i].length; j++)
		{
			var nCount = 0;
			// i-1, j-1			
			if(gridParam[modulo((i-1),(gridParam.length))][modulo((j-1),gridParam[i].length)].visible)
			{
				nCount++;
			}
			
			// i-1, j
			if(gridParam[modulo((i-1),(gridParam.length))][modulo((j),gridParam[i].length)].visible)
			{
				nCount++;
			}
			
			// i-1, j+1
			if(gridParam[modulo((i-1),(gridParam.length))][modulo((j+1),gridParam[i].length)].visible)
			{
				nCount++;
			}
			
			// i, j+1
			if(gridParam[modulo((i),(gridParam.length))][modulo((j+1),gridParam[i].length)].visible)
			{
				nCount++;
			}
			
			// i+1, j+1
			if(gridParam[modulo((i+1),(gridParam.length))][modulo((j+1),gridParam[i].length)].visible)
			{
				nCount++;
			}
			
			// i+1, j
			if(gridParam[modulo((i+1),(gridParam.length))][modulo((j),gridParam[i].length)].visible)
			{
				nCount++;
			}
			
			// i+1, j-1
			if(gridParam[modulo((i+1),(gridParam.length))][modulo((j-1),gridParam[i].length)].visible)
			{
				nCount++;
			}
			
			// i, j-1
			if(gridParam[modulo((i),(gridParam.length))][modulo((j-1),gridParam[i].length)].visible)
			{
				nCount++;
			}
			
			// if cell dead and 3 neighbours, make alive
			if(!gridParam[i][j].visible && nCount == 3)
			{
				var makeAlive = new action(i,j,true);
				actionQ.push(makeAlive);
			}			
			// if cell alive
			else if(gridParam[i][j].visible)
			{
				// < 2 or > 3 neighbours
				if(nCount < 2 || nCount > 3)
				{
					//dies
					var makeDead = new action(i,j,false);
					actionQ.push(makeDead);
				}
				// if 2 or 3 neighbours, it will live on
				// - no action necessary
			}
			
		}
	}
} // end countNeighbours fn

// execute all actions in actionQ
function executeActions(gridParam, actionQ)
{
	while(actionQ.length)
	{
		var act = actionQ.pop();
		// Action code corresponds to mesh visibility
		gridParam[act.xIndex][act.yIndex].visible = act.actionCode;
	}
}