/**
 * Main class for game Spots
 * 
 * @author Halyna Kyryliuk
 * */

var context;
var canvas;
var level;
var game_field;
var active_spot = null;
var update_handler = null;

var field_width;
var field_height;

var CELL_SIZE = 60;
var POINT_RADIUS = CELL_SIZE/2-2;
var POINT_DEM = 4;
var P_COLOR = 'rgb(200, 0, 0)';
var P_COLOR_A = 'rgb(200, 0, 100)';
var O_COLOR = 'rgb(0, 200, 0)';
var B_COLOR = 'rgb(0, 0, 0)';
var EMPTY = 0;
var PLAYER = 1;
var OPPONENT = 2;
var DUMMY = -1;

var turn = PLAYER;

var timer_id;
var timer = 10;

// Game initialization
function initGame(cvs, lvl, handler){
	update_handler = handler;
	canvas = cvs;
    context = canvas.getContext("2d");
	level = lvl;
	game_field = LEVELS[level];
	field_height = game_field.length;
	field_width = game_field[0].length;
	drawGameField();
	turn = PLAYER;
	
	timer_id = setInterval(onTimer, 1000);
    timer = 10;
    update_handler({ time: timer, s1: getScore(PLAYER), s2: getScore(OPPONENT) });
}


// Redraw game field
function updateGameField(){
	context.clearRect(0, 0, canvas.width, canvas.height);
    drawGameField();
    var sp = getScore(PLAYER);
    var so = getScore(OPPONENT);
    res = null;
    if (checkGameFinished()) {
        res = Math.sign(sp - so);
        clearInterval(timer_id);
    }
	update_handler({s1:sp, s2:so, result:res});
}

// On timer: decrimant time or miss step
function onTimer(){
	if  (turn == OPPONENT) return;
	update_handler({time:timer});
	timer--;
	if (timer < 0){
		missStep();
    }
}

// If player miss step
function missStep(){
	update_handler({time:0});
	onStepMade();
}

// Drawing grid and all spots
function drawGameField(){
	for (var i = 0; i<field_height; i++){
		for (var j = 0; j<field_width; j++){
			switch (game_field[i][j]){
				case EMPTY: 
					drawCell(j, i, false);
					break;
				case PLAYER: 
					drawCell(j, i);
					drawSpot(j, i, P_COLOR);
					break;
				case OPPONENT: 
					drawCell(j, i);
					drawSpot(j, i, O_COLOR);
					break;
				case DUMMY:
					drawCell(j, i, true);
					break;	
			}
		}
	}
}

// Draw cell depanding for its type
function drawCell(col, row, fill){
	if (fill){
		context.fillStyle = B_COLOR;
		context.fillRect(col*CELL_SIZE, row*CELL_SIZE, CELL_SIZE, CELL_SIZE);
	}else context.strokeRect(col*CELL_SIZE, row*CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

// Draw spot of defined color
function drawSpot(col, row, color){
	var d = (CELL_SIZE - 2*POINT_RADIUS)/2
	context.fillStyle = color;
	context.beginPath();
	context.arc(col*CELL_SIZE + POINT_RADIUS + d, row*CELL_SIZE + POINT_RADIUS + d, POINT_RADIUS, 0, 2*Math.PI);
	context.fill();
}

// Initialization of empty field
function initEmptyField(){
	game_field = [];
	for (var i = 0; i<10; i++){
		game_field.push([]);
		for (var j = 0; j<10; j++){
			game_field[i].push(0);
			drawCell(i, j);
		}
	}
}

// Initialization of all sppots on the field
function initDefaultPoints(){
	var i,j;
	for (i = 0; i<=POINT_DEM; i++){
		for (j = 0; j<POINT_DEM-i; j++){
			drawPoint(j, i, P_COLOR);
			game_field[j][i] = 1;
		}
	}
	
	for (i = FIELD_SIZE - 1; i>=FIELD_SIZE-POINT_DEM; i--){
		for (j = 2*FIELD_SIZE-POINT_DEM-i-1; j<FIELD_SIZE; j++){
			drawPoint(j, i, O_COLOR);
			game_field[j][i] = 2;
		}
	}
}

// Mouse click handler
function clickHandler(e){
	if (turn != PLAYER) return;
	var px = e.pageX - e.target.offsetLeft;
	var py = e.pageY - e.target.offsetTop;
	var col = Math.floor(px/CELL_SIZE);
	var row = Math.floor(py/CELL_SIZE);
	var p = game_field[row][col];
    switch (p) {
        // click on player's spot
		case PLAYER:
			if (!active_spot) {
				active_spot = [col,row];
				drawSpot(col, row, P_COLOR_A);
			}
			else if (active_spot[0] == col && active_spot[1] == row){ 
					active_spot = null;
					drawSpot(col, row, (active_spot)?P_COLOR_A:P_COLOR);
				}else{
					drawSpot(active_spot[0], active_spot[1], P_COLOR);
					active_spot[0] = col;
					active_spot[1] = row;
					drawSpot(col, row, P_COLOR_A);
				}
            break;
        // click on empty cell
		case EMPTY:	
			if (tryToMakeStep(col, row)) onStepMade();
			break;
	}
}

// Check if it's possible to male step in [col, row] cell
function tryToMakeStep(col, row){
	if (!active_spot) return false;
	var dcol = col - active_spot[0];
	var drow = row - active_spot[1];
	var res = prossedStep(PLAYER, active_spot[0], active_spot[1] ,dcol, drow);
	if (res){
		active_spot = null;
		updateGameField();
		return true;
	}
	return false;
}

/** Spot can be move only to 8 neighbour cell or jump through one cell by diagonal, vertical or horizontal
 * |J| |J| |J|
 * | |M|M|M| | 
 * |J|M|O|M|J| 
 * | |M|M|M| | 
 * |J| |J| |J|
 * */
function prossedStep(id, col, row, dcol, drow){
	//console.log("step ",  id, " from ", col, row, " for ", dcol, drow);
	if (Math.abs(dcol) <=1 && Math.abs(drow) <= 1){
		game_field[row+drow][col+dcol] = id;
		checkNeighbours(col+dcol, row+drow, id);
		return true;
	}else{
		if (Math.abs(dcol) == 2 && Math.abs(drow) == 2 || Math.abs(dcol) == 2 && drow == 0 || dcol == 0 && Math.abs(drow) == 2 ){
			game_field[row][col] = 0;
			game_field[row+drow][col+dcol] = id;
			checkNeighbours(col+dcol, row+drow, id);
			return true;
		}		
	}
	return false;
}

// When step is done
function onStepMade() {
    if (turn == PLAYER) {
            turn = OPPONENT;
            setTimeout(makeStepOppenent, 700);
        } else {
            //turn = PLAYER;
    }
}

// Computer make step
function makeStepOppenent(){
	var step = calculateStepAI();
    if (step) {
        var res = prossedStep(OPPONENT, step[0], step[1], step[2][0], step[2][1]);
        if (res) {
            turn = PLAYER;
            timer = 10;
            updateGameField();
        }
    } else {
        turn = PLAYER;
        timer = 10;
        updateGameField();
    }
}

// Convert neighbours to id
function checkNeighbours(col, row, id){
	for (var i = 0; i<NEIGHBOURS.length; i++){
		var ncol = col + NEIGHBOURS[i][0];
		var nrow = row + NEIGHBOURS[i][1];
		if (outOfRange(ncol, nrow)) continue;
		var value = game_field[nrow][ncol];
		if (value != id && value != EMPTY && value != DUMMY){
			game_field[nrow][ncol] = id;
		}
	}
} 

// Calculation of the score for player with id
function getScore(id){
	var res = 0;
	for (var i = 0; i<field_height; i++)
		for (var j = 0; j<field_width; j++)
            if (game_field[i][j] == id) res++;
	return (res < 10) ? (' ' + res) : res;	
}

// Checking if game is finished
function checkGameFinished() {
    if (getScore(PLAYER) == 0) return true;
    for (var i = 0; i < field_height; i++)
        for (var j = 0; j < field_width; j++)
            if (game_field[i][j] == EMPTY) return false;
    return true;
}

// ------------------ AI ------------------
/*
* Calculating the best step for computer
 * @return [col, row, [dcol, drow]]
*/
function calculateStepAI(){
	var cur_score = getScore(OPPONENT);
	
	var best_score = cur_score;
    var best_step = null;
	for (var i = 0; i<field_height; i++)
		for (var j = 0; j<field_width; j++){
			if (game_field[i][j] == OPPONENT){
				var step_res = bestStepForSpot(j, i);
				var d_score = step_res[1];
				if (step_res[0] == null) continue;
				if (cur_score + d_score >= best_score){
					best_score = cur_score + d_score; 
					best_step = [j, i, step_res[0]];
				}
			}
		}
	
	return best_step;
}

// Coordinates are out of the field
function outOfRange(col, row){
	return (col<0 || row<0 || col>=field_width || row >= field_height); 
}

/*
* Best step for defined spot
 * @return [[dcol, drow], max_score]
*/	
function bestStepForSpot(col, row){
	var cur_pos = [col, row];
	var j = 0;
	var pos  = [];
	var max_s = 0;
	var s_n = 0; 
	var d_pos = [];
	for (j = 0; j<POSSIBLE_MOVING.length; j++){
		pos = [cur_pos[0] + POSSIBLE_MOVING[j][0], cur_pos[1] + POSSIBLE_MOVING[j][1]]; 
		if (outOfRange(pos[0], pos[1])) continue;
		if (game_field[pos[1]][pos[0]] == EMPTY){
			s_n = getScoreAfterStep(cur_pos, pos);
			if (s_n > max_s){
				max_s = s_n;
				d_pos = [POSSIBLE_MOVING[j][0], POSSIBLE_MOVING[j][1]];
			}
		}	
	}
	return [d_pos, max_s];
} 

// Calculation score if specified step will be done
function getScoreAfterStep(cur_pos, new_pos){
	var res = 0;
	var map = arrayClone(game_field);
	if (Math.abs(new_pos[0] - cur_pos[0]) <=1 && Math.abs(new_pos[1] - cur_pos[1]) <= 1){
		map[new_pos[1]][new_pos[0]] = map[cur_pos[1]][cur_pos[0]] ;
		res++;
	}else{
		map[new_pos[1]][new_pos[0]] = map[cur_pos[1]][cur_pos[0]] ;
		map[cur_pos[1]][cur_pos[0]] = EMPTY;
	}
	for (var i = 0; i<NEIGHBOURS.length; i++){
		var p = [new_pos[0] + NEIGHBOURS[i][0], new_pos[1] + NEIGHBOURS[i][1]];
		if (outOfRange(p[0], p[1])) continue;
		if (map[p[1]][p[0]] == EMPTY || map[p[1]][p[0]] == DUMMY) continue;
		if(map[p[1]][p[0]] != map[new_pos[1]][new_pos[0]]){
			map[p[1]][p[0]] = map[new_pos[1]][new_pos[0]];
			res++;
		}
	}
	return res;
}

// Cloning array
function arrayClone(arr) {
	var i, copy;
	
	if (Array.isArray(arr)) {
		copy = arr.slice(0);
		for (i = 0; i < copy.length; i++) {
			copy[i] = arrayClone(copy[i]);
		}
		return copy;
	} else if(typeof arr === 'object') {
		throw 'Cannot clone array containing an object!';
	} else {
		return arr;
	}
	
}

// ------------------ constants ---------------

var NEIGHBOURS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
var POSSIBLE_MOVING = 
	[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [-2, -2], [0, -2], [2, -2], [-2, 0], [2, 0], [-2, 2], [0, 2], [2, 2]];

var LEVELS = [
	//1
	[[1,1,1,0,0,0,0,0],
	 [1,1,0,0,0,0,0,0],
	 [1,0,0,0,0,0,0,0],
	 [0,0,0,0,0,0,0,0],
	 [0,0,0,0,0,0,0,0],
	 [0,0,0,0,0,0,0,2],
	 [0,0,0,0,0,0,2,2],
	 [0,0,0,0,0,2,2,2],
	],
	//2
	[[1,1,1,-1,-1,0,0,0],
	 [1,1,0,-1,-1,0,0,0],
	 [1,0,0,0,0,0,0,0],
	 [-1,-1,0,0,0,0,-1,-1],
	 [-1,-1,0,0,0,0,-1,-1],
	 [0,0,0,0,0,0,0,2],
	 [0,0,0,-1,-1,0,2,2],
	 [0,0,0,-1,-1,2,2,2],
	],
	//3
	[[1,1,1,-1,-1,0,0,0],
	 [1,-1,0,0,0,0,-1,0],
	 [1,0,-1,0,0,-1,0,0],
	 [-1,0,0,0,0,0,0,-1],
	 [-1,0,0,0,0,0,0,-1],
	 [0,0,-1,0,0,-1,0,2],
	 [0,-1,0,0,0,0,-1,2],
	 [0,0,0,-1,-1,2,2,2],
	],
	//4
	[[1,1,1,0,0,-1,0,0],
	 [1,1,0,0,-1,0,0,0],
	 [-1,0,0,-1,0,0,0,0],
	 [0,-1,0,-1,-1,-1,0,0],
	 [0,0,-1,-1,-1,0,-1,0],
	 [0,0,0,0,-1,0,0,-1],
	 [0,0,0,-1,0,0,2,2],
	 [0,0,-1,0,0,2,2,2],
	 
    ],
    //5
	[
	 [1,1,0,0,0],
	 [1,0,0,0,0],
	 [0,0,0,0,2],
	 [0,0,0,2,2],
	],		
];