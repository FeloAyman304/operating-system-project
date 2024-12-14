
// Global array to store process data
const processes = [];

// Event listeners
window.onload = () => {
    document.getElementById('addProcess').addEventListener('click', addProcess);
    document.getElementById('schedule').addEventListener('click', runScheduler);
    document.getElementById('algorithm').addEventListener('change', handleAlgorithmChange);
};

// Add a process to the list
function addProcess() {
    const processId = document.getElementById('processId').value;
    const arrivalTime = parseInt(document.getElementById('arrivalTime').value);
    const burstTime = parseInt(document.getElementById('burstTime').value);
    const priority = parseInt(document.getElementById('priority').value) || null;

    if (!processId || isNaN(arrivalTime) || isNaN(burstTime)) {
        alert('Please fill out all required fields correctly.');
        return;
    }

    processes.push({ processId, arrivalTime, burstTime, priority });
    updateProcessTable();

    // Clear input fields
    document.getElementById('process-form').reset();
}

// Update the process table
function updateProcessTable() {
    const tableBody = document.querySelector('#process-table tbody');
    tableBody.innerHTML = '';

    processes.forEach((process) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${process.processId}</td>
            <td>${process.arrivalTime}</td>
            <td>${process.burstTime}</td>
            <td>${process.priority !== null ? process.priority : 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Handle algorithm selection change
function handleAlgorithmChange() {
    const algorithm = document.getElementById('algorithm').value;
    const timeQuantumField = document.getElementById('timeQuantumField');

    if (algorithm === 'rr') {
        timeQuantumField.style.display = 'block';
    } else {
        timeQuantumField.style.display = 'none';
    }
}

// Run selected scheduler
function runScheduler() {
    const algorithm = document.getElementById('algorithm').value;

    if (processes.length === 0) {
        alert('Please add at least one process.');
        return;
    }

    switch (algorithm) {
        case 'fcfs':
            calculateFCFS();
            break;
        case 'sjf':
            calculateSJF();
            break;
        case 'srtf':
            calculateSRTF();
            break;
        case 'rr':
            const timeQuantum = parseInt(document.getElementById('timeQuantum').value);
            if (isNaN(timeQuantum) || timeQuantum <= 0) {
                alert('Please provide a valid time quantum for Round Robin.');
                return;
            }
            calculateRR(timeQuantum);
            break;
        case 'priority':
            calculatePriority();
            break;
        default:
            alert('Invalid algorithm selected.');
    }
}

// First-Come, First-Served (FCFS) Scheduling
function calculateFCFS() {
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    const results = [];

    sortedProcesses.forEach((process) => {
        const startTime = Math.max(currentTime, process.arrivalTime);
        const endTime = startTime + process.burstTime;
        currentTime = endTime;

        const turnaroundTime = endTime - process.arrivalTime;
        const waitingTime = turnaroundTime - process.burstTime;

        results.push({
            processId: process.processId,
            startTime,
            endTime,
            turnaroundTime,
            waitingTime,
            burstTime: process.burstTime,
        });
    });

    displayResults(results);
    drawGanttChart(results);
}

// Shortest Job First (SJF) Scheduling
function calculateSJF() {
    const sortedProcesses = [...processes].sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    const results = [];

    sortedProcesses.forEach((process) => {
        const startTime = Math.max(currentTime, process.arrivalTime);
        const endTime = startTime + process.burstTime;
        currentTime = endTime;

        const turnaroundTime = endTime - process.arrivalTime;
        const waitingTime = turnaroundTime - process.burstTime;

        results.push({
            processId: process.processId,
            startTime,
            endTime,
            turnaroundTime,
            waitingTime,
            burstTime: process.burstTime,
        });
    });

    displayResults(results);
    drawGanttChart(results);
}

// Shortest Remaining Time First (SRTF) Scheduling
function calculateSRTF() {
    // Create a copy of processes with an additional 'remainingTime' property
    const processesCopy = processes.map((p) => ({
        ...p,
        remainingTime: p.burstTime,
    }));
    
    let currentTime = 0;
    const results = [];
    const completed = new Set(); // To track completed processes
    const ganttChart = []; // To track process execution order for the Gantt chart

    while (completed.size < processes.length) {
        // Get all processes that have arrived and are not completed
        const availableProcesses = processesCopy.filter(
            (p) => p.arrivalTime <= currentTime && !completed.has(p.processId)
        );

        if (availableProcesses.length === 0) {
            // If no process is available, increment the time
            currentTime++;
            continue;
        }

        // Find the process with the shortest remaining time
        const currentProcess = availableProcesses.reduce((shortest, process) => 
            process.remainingTime < shortest.remainingTime ? process : shortest
        );

        // Execute the process for one time unit
        ganttChart.push({ processId: currentProcess.processId, startTime: currentTime });
        currentProcess.remainingTime--;
        currentTime++;

        // If the process finishes, calculate its metrics and mark it as completed
        if (currentProcess.remainingTime === 0) {
            const endTime = currentTime;
            const turnaroundTime = endTime - currentProcess.arrivalTime;
            const waitingTime = turnaroundTime - currentProcess.burstTime;

            results.push({
                processId: currentProcess.processId,
                startTime: endTime - currentProcess.burstTime,
                endTime,
                turnaroundTime,
                waitingTime,
                burstTime: currentProcess.burstTime,
            });

            completed.add(currentProcess.processId);
        }
    }

    // Display results and draw the Gantt chart
    displayResults(results);
    drawSRTFGanttChart(ganttChart);
}

// Custom Gantt chart for SRTF
function drawSRTFGanttChart(ganttData) {
    const ganttChartDiv = document.getElementById('gantt-chart');
    ganttChartDiv.innerHTML = ''; // Clear previous content

    const scale = 20; // Scaling factor for proportional width
    const chartContainer = document.createElement('div');
    chartContainer.style.display = 'flex';
    chartContainer.style.alignItems = 'center';

    let currentProcess = null;
    let startTime = 0;

    ganttData.forEach((event, index) => {
        if (currentProcess !== event.processId) {
            // End previous process block
            if (currentProcess !== null) {
                const duration = event.startTime - startTime;
                const block = createGanttBlock(currentProcess, startTime, event.startTime, duration, scale);
                chartContainer.appendChild(block);
            }
            // Start new process block
            currentProcess = event.processId;
            startTime = event.startTime;
        }
    });

    // Add the last process block
    const lastEvent = ganttData[ganttData.length - 1];
    const duration = lastEvent.startTime - startTime + 1;
    const block = createGanttBlock(currentProcess, startTime, lastEvent.startTime + 1, duration, scale);
    chartContainer.appendChild(block);

    ganttChartDiv.appendChild(chartContainer);
}

// Helper function to create a Gantt chart block
function createGanttBlock(processId, startTime, endTime, duration, scale) {
    const block = document.createElement('div');
    block.style.display = 'inline-block';
    block.style.width = `${duration * scale}px`;
    block.style.border = '2px solid black';
    block.style.textAlign = 'center';
    block.style.backgroundColor = '#90ee90';
    block.style.padding = '10px 0';
    block.innerHTML = `<strong>${processId}</strong><br>${startTime}-${endTime}`;
    return block;
}



// Round Robin (RR) Scheduling
function calculateRR(timeQuantum) {
    const queue = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const results = [];
    let currentTime = 0;

    while (queue.length > 0) {
        const process = queue.shift();
        const executionTime = Math.min(process.burstTime, timeQuantum);
        const startTime = Math.max(currentTime, process.arrivalTime);
        const endTime = startTime + executionTime;
        currentTime = endTime;

        const turnaroundTime = endTime - process.arrivalTime;
        const waitingTime = turnaroundTime - process.burstTime;

        results.push({
            processId: process.processId,
            startTime,
            endTime,
            turnaroundTime,
            waitingTime,
            burstTime: process.burstTime,
        });

        if (process.burstTime > timeQuantum) {
            queue.push({
                ...process,
                burstTime: process.burstTime - timeQuantum,
                arrivalTime: currentTime,
            });
        }
    }

    displayResults(results);
    drawGanttChart(results);
}

// Priority Scheduling
function calculatePriority() {
    const sortedProcesses = [...processes].sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    const results = [];

    sortedProcesses.forEach((process) => {
        const startTime = Math.max(currentTime, process.arrivalTime);
        const endTime = startTime + process.burstTime;
        currentTime = endTime;

        const turnaroundTime = endTime - process.arrivalTime;
        const waitingTime = turnaroundTime - process.burstTime;

        results.push({
            processId: process.processId,
            startTime,
            endTime,
            turnaroundTime,
            waitingTime,
            burstTime: process.burstTime,
        });
    });

    displayResults(results);
    drawGanttChart(results);
}

// Calculate metrics (Average Waiting Time, Average Turnaround Time)
function calculateMetrics(results) {
    let totalWaitingTime = 0;
    let totalTurnaroundTime = 0;

    results.forEach(result => {
        const waitingTime = result.startTime - processes.find(p => p.processId === result.processId).arrivalTime;
        const turnaroundTime = result.endTime - processes.find(p => p.processId === result.processId).arrivalTime;

        result.waitingTime = waitingTime;
        result.turnaroundTime = turnaroundTime;

        totalWaitingTime += waitingTime;
        totalTurnaroundTime += turnaroundTime;
    });

    const avgWaitingTime = totalWaitingTime / results.length;
    const avgTurnaroundTime = totalTurnaroundTime / results.length;

    return {
        avgWaitingTime: avgWaitingTime.toFixed(2),
        avgTurnaroundTime: avgTurnaroundTime.toFixed(2),
    };
}

// Display results
function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<h5>Scheduling Results:</h5>';

    // Display individual process results
    results.forEach((result) => {
        const p = document.createElement('p');
        p.textContent = `Process ${result.processId}: Start Time = ${result.startTime}, End Time = ${result.endTime}, Turnaround Time = ${result.turnaroundTime}, Waiting Time = ${result.waitingTime}`;
        resultsDiv.appendChild(p);
    });

    // Calculate and display average times
    const { avgWaitingTime, avgTurnaroundTime } = calculateMetrics(results);
    resultsDiv.innerHTML += `
        <p><strong>Average Waiting Time:</strong> ${avgWaitingTime}</p>
        <p><strong>Average Turnaround Time:</strong> ${avgTurnaroundTime}</p>
    `;
}

// Draw Gantt Chart
function drawGanttChart(results) {
    const ganttChartDiv = document.getElementById('gantt-chart');
    ganttChartDiv.innerHTML = ''; // Clear previous content

    // Define scaling factor for proportional width (e.g., 20px per unit of time)
    const scale = 20;

    // Create the Gantt chart container
    const chartContainer = document.createElement('div');
    chartContainer.style.display = 'flex';
    chartContainer.style.alignItems = 'center';
    chartContainer.style.margin = '10px 0';

    results.forEach((result) => {
        const duration = result.endTime - result.startTime;

        // Create a block for the process
        const block = document.createElement('div');
        block.style.display = 'inline-block';
        block.style.width = `${duration * scale}px`; // Width proportional to duration
        block.style.border = '2px solid black';
        block.style.textAlign = 'center';
        block.style.backgroundColor = '#add8e6';
        block.style.padding = '10px 0';

        // Add content: Process ID, Start Time, End Time
        block.innerHTML = `
            <strong>${result.processId}</strong><br>
             ${result.startTime}
            - ${result.endTime}
        `;

        chartContainer.appendChild(block);
    });

    ganttChartDiv.appendChild(chartContainer); // Add chart to the container
}












// Update the process table with Edit and Delete buttons
function updateProcessTable() {
    const tableBody = document.querySelector('#process-table tbody');
    tableBody.innerHTML = '';

    processes.forEach((process, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${process.processId}</td>
            <td>${process.arrivalTime}</td>
            <td>${process.burstTime}</td>
            <td>${process.priority !== null ? process.priority : 'N/A'}</td>
            <td class="grid text-center d-flex">
                <button  onclick="editProcess(${index})">Edit</button>
                <button onclick="deleteProcess(${index})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Edit a process
function editProcess(index) {
    const process = processes[index];

    // Populate the form with the process data
    document.getElementById('processId').value = process.processId;
    document.getElementById('arrivalTime').value = process.arrivalTime;
    document.getElementById('burstTime').value = process.burstTime;
    document.getElementById('priority').value = process.priority || '';

    // Change the button action to update the process
    const addButton = document.getElementById('addProcess');
    addButton.textContent = 'Update Process';
    addButton.removeEventListener('click', addProcess);
    addButton.addEventListener('click', () => updateProcess(index));
}

// Update the process in the array
function updateProcess(index) {
    const processId = document.getElementById('processId').value;
    const arrivalTime = parseInt(document.getElementById('arrivalTime').value);
    const burstTime = parseInt(document.getElementById('burstTime').value);
    const priority = parseInt(document.getElementById('priority').value) || null;

    if (!processId || isNaN(arrivalTime) || isNaN(burstTime)) {
        alert('Please fill out all required fields correctly.');
        return;
    }

    // Update the process in the array
    processes[index] = { processId, arrivalTime, burstTime, priority };

    // Reset the form and button
    document.getElementById('process-form').reset();
    const addButton = document.getElementById('addProcess');
    addButton.textContent = 'Add Process';
    addButton.removeEventListener('click', updateProcess);
    addButton.addEventListener('click', addProcess);

    // Update the table
    updateProcessTable();
}

// Delete a process
function deleteProcess(index) {
    // Remove the process from the array
    processes.splice(index, 1);

    // Update the table
    updateProcessTable();
}













function clearData() {
    // Reset processes array (or any relevant global data)
    processes = []; // Assuming 'processes' is globally defined

    // Clear results display
    const resultsTable = document.getElementById('resultsTable'); // Adjust ID as needed
    if (resultsTable) {
        resultsTable.innerHTML = '';
    }

    // Clear Gantt Chart
    const ganttChart = document.getElementById('ganttChart'); // Adjust ID as needed
    if (ganttChart) {
        ganttChart.innerHTML = '';
    }

    // Optionally reset other UI elements like input fields
    const inputFields = document.querySelectorAll('.processInput');
    inputFields.forEach((field) => (field.value = ''));
    
    console.log("Data cleared.");
}
