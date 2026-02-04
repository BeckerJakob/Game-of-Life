
// Patterns Data
this.patterns = {
    'Still Lifes': [
        { name: 'Block', points: [[0, 0], [1, 0], [0, 1], [1, 1]] },
        { name: 'Bee-Hive', points: [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [2, 2]] }
    ],
    'Oscillators': [
        { name: 'Blinker', points: [[0, 0], [1, 0], [2, 0]] },
        { name: 'Toad', points: [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1]] },
        { name: 'Beacon', points: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 2], [3, 2], [2, 3], [3, 3]] }
    ],
    'Spaceships': [
        { name: 'Glider', points: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]] },
        { name: 'LWSS', points: [[1, 0], [4, 0], [0, 1], [0, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3]] }
    ]
};

this.selectedPattern = null;
this.objList = document.getElementById('objects-list');
this.populateObjects();
