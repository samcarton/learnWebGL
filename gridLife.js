// gridLife.js
// A simple game of life implementation using three.js planes and an orthographic camera.
// By Sam Carton, July 2013
// http://SamCarton.com


// Timer variables
var lastTime = new Date().getTime();
var activateTimer = 0;
var activationTime = 100;
var tick = 0;
var running = false;

// Randomised activation level
// 0 -> 1
// The amount of grid cells that start initially alive.
var randActivation = 0.1;

// Grid params
var gridHeight = 40;
var gridWidth = 40;
var cellSize = 20;

// Renderer
var padding = 200; // pad the renderer size a bit

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth - padding, window.innerHeight-padding);
// append renderer to DOM
document.body.appendChild(renderer.domElement);

var aspectRatio = (window.innerWidth - padding)/ (window.innerHeight-padding);

//camera
var camera = new THREE.OrthographicCamera(0, gridWidth*cellSize * aspectRatio, gridHeight*cellSize, 0, 0, 100);

// Three.js scene to hold everything
var scene = new THREE.Scene();


// Make the 2D array (grid)

var grid = new Array(gridWidth);
for(var i = 0; i< gridWidth; i++)
{
	grid[i] = new Array(gridHeight);
}

//populate grid
var gridLength = gridHeight*gridWidth;
var x = 0, y = 0;
var black = true; // for alternating colour 
for(var i = 0; i<gridLength;i++)
{
	if (black)
	{
		col = 0x880000;
		black = false;
	}
	else
	{
		col = 0xFF9900;
		black = true;
	}
	// create a new plane mesh for this cell, using the given color for the material
	grid[x][y] = new THREE.Mesh(new THREE.PlaneGeometry(cellSize,cellSize), new THREE.MeshBasicMaterial({color:col}));
	grid[x][y].position.x = x*cellSize+cellSize/2;
	grid[x][y].position.y = y*cellSize+cellSize/2;	
	grid[x][y].visible = false;
	
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
var bgColor = 0xEEEEEE;
var bgPlane = new THREE.Mesh(
	new THREE.PlaneGeometry(cellSize*gridWidth,cellSize*gridHeight),
	new THREE.MeshBasicMaterial({
		color:bgColor}));
bgPlane.position.x = cellSize*gridWidth/2;
bgPlane.position.y = cellSize*gridHeight/2;
scene.add(bgPlane);

// a couple of simple Life entities to test (need to start with an empty grid).
/*
//blinker
grid[15][10].visible = true;
grid[15][11].visible = true;
grid[15][12].visible = true;

//glider
grid[8][11].visible = true;
grid[9][10].visible = true;
grid[10][10].visible = true;
grid[10][11].visible = true;
grid[10][12].visible = true;
*/

// Set initial conditions of the grid
function setSeed(){
	x = 0; y = 0;
	for(var i = 0; i< gridLength; i++)
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

// Set parameters from HTML form input
// stops simulation if it is running.
function setParams(){
	stop();		
	
	//grab the form and store it in an array object
	var form = document.getElementById("paramForm");
	// first entry is tickTime
	var tempTickTime = parseFloat(form.elements[0].value);
	// second entry is activation value
	var tempActivation = parseFloat(form.elements[1].value);
	
	// quick check of valid values
	if(tempTickTime >= 50 && tempActivation >= 0 && tempActivation <= 1)
	{
		tick = 0;		
		// update tick count display
		document.getElementById("counter").innerHTML = "Tick: " + tick;
		activationTime = tempTickTime;
		randActivation = tempActivation;
		// set the grid
		setSeed();		
	}
	else // validation failed
	{
		alert("Invalid form input. Check and try again.");
	}
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
	
	// update tick display
	// The element in HTML: <p id="counter"> </p>
	// This is grabbed and then the inner text is updated.
	document.getElementById("counter").innerHTML = "Tick: " + tick;
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
		while(activateTimer > activationTime && loop < maxLoop)
		{			
			loop++;
			activateTimer = activateTimer - activationTime;
			advanceGeneration();			
		}
	}
	// keep time for next loop
	lastTime = time;
	
	//render scene
	renderer.render(scene, camera);
	
	//request new frame
	requestAnimationFrame(function(){
		animate();
	});	
}

// Set the board
setSeed();

// Start animation
animate();



// Set the resize function for window resize events.
window.addEventListener( 'resize', onWindowResize, false);

function onWindowResize(){	
	renderer.setSize(window.innerWidth - padding, window.innerHeight-padding);

	var aspectRatio = (window.innerWidth - padding)/ (window.innerHeight-padding);

	//camera params
	camera.right = gridWidth*cellSize * aspectRatio;
	camera.top = gridHeight*cellSize;
	// need to reset proj matrix after changing params
	camera.updateProjectionMatrix();	
}


// Variable to track stop/start on losing focus from window
var wasRunning = false;

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