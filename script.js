// Event listeners for range inputs to update corresponding UI elements
document.getElementById("speedRange").addEventListener("input", function () {
  document.getElementById("speedValue").textContent = this.value;
});
document.getElementById("heightRange").addEventListener("input", function () {
  document.getElementById("heightValue").textContent = this.value;
});
document.getElementById("channelsRange").addEventListener("input", function () {
  document.getElementById("channelsValue").textContent = this.value;
});

// Container to hold waveform charts
const chartsContainer = document.getElementById("chartsContainer");

// Array to store SmoothieCharts instances
var smoothieCharts = [];
var timeSeries = [];

function drawCharts(channels, height, speed) {
  for (let i = 0; i < channels; i++) {
    var canvasDiv = document.createElement("div");
    canvasDiv.classList.add("canvas-container");
    canvasDiv.innerHTML = `
      <div class="parent m-4 p-1 bg-black text-white rounded-2 position-relative" id="parent-${i}">
          <span class="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-light text-dark fs-6">
          ${isConnected ? `CH${i + 1}` : "No device connected!"}
          </span>
          <canvas id="waveform${i}"></canvas>
      </div>
    `;
    chartsContainer.appendChild(canvasDiv);
    document.getElementById(`parent-${i}`).style.height = `${height}px`;
    // Set canvas height to fixed value
    var canvas = document.getElementById(`waveform${i}`);
    canvas.height = document.getElementById(`parent-${i}`).offsetHeight - 10;
    canvas.width = document.getElementById(`parent-${i}`).offsetWidth - 10;

    smoothieCharts[i] = new SmoothieChart({
      millisPerPixel: 2,
      grid: {
        strokeStyle: "rgba(0, 0, 0, 0.1)",
        lineWidth: 1,
        millisPerLine: 250,
        verticalSections: 6,
      },
      labels: {
        fillStyle: "white",
        fontWeight: "bold",
        showIntermediateLabels: true,
      },
      tooltipLine: { strokeStyle: "#ffffff" },
    });

    timeSeries[i] = new TimeSeries();
    smoothieCharts[i].addTimeSeries(timeSeries[i], {
      strokeStyle: "rgb(255, 255, 255)",
      lineWidth: 1,
    });
    smoothieCharts[i].streamTo(document.getElementById(`waveform${i}`), 30);
  }

  updateSpeed(speed);
}

function updateSpeed(speed) {
  // Log the received speed level to confirm
  console.log("Received speed level:", speed);

  // Adjust the refresh rate of the SmoothieChart based on the speed level
  switch (speed) {
    case 1:
      // Set to slow refresh rate
      smoothieCharts.forEach((smoothie) => {
        smoothie.options.millisPerPixel = 8;
      });
      break;
    case 2:
      // Set to medium refresh rate
      smoothieCharts.forEach((smoothie) => {
        smoothie.options.millisPerPixel = 4;
      });
      break;
    case 3:
      // Set to fast refresh rate
      smoothieCharts.forEach((smoothie) => {
        smoothie.options.millisPerPixel = 2;
      });
      break;
    default:
      break;
  }
  // Log the updated options for verification
  smoothieCharts.forEach((smoothie, index) => {});
}
function destroyCharts() {
  // Clear charts container
  for (var i = 0; i < smoothieCharts.length; i++) {
    smoothieCharts[i].stop();
  }
  while (chartsContainer.firstChild) {
    chartsContainer.removeChild(chartsContainer.firstChild);
  }
  timeSeries = [];
  smoothieCharts = [];
}
function getSettings() {
  // Get settings
  var height = parseInt(localStorage.getItem(`heightValue`)) || 1;
  var channels = parseInt(localStorage.getItem("channelsValue")) || 1;
  var speed = parseInt(localStorage.getItem("speedValue")) || 2;

  const settings = { height: height, channels: channels, speed: speed };
  return settings;
}

function saveSettings() {
  localStorage.setItem(
    "speedValue",
    document.getElementById("speedRange").value
  );
  localStorage.setItem(
    "heightValue",
    document.getElementById("heightRange").value
  );
  localStorage.setItem(
    "channelsValue",
    document.getElementById("channelsRange").value
  );

  // Destroy existing charts
  destroyCharts();
  const settings = getSettings();
  height = 200 + (settings.height - 1) * 40;
  // Draw new charts
  drawCharts(settings.channels, height, settings.speed);

  // Update chart labels if connected
  if (isConnected) {
    updateChartLabels();
  }
}

// Event listener for the save changes button
document.getElementById("saveChanges").addEventListener("click", saveSettings);
window.addEventListener("load", function () {
  // Check if the browser is compatible with the Web Serial API
  if (!navigator.serial) {
    // Display the compatibility message
    document.getElementById("compatibilityMessage").style.display = "block";
    // Hide the navbar
    document.querySelector("nav").style.display = "none";
    return; // Exit the function to prevent further execution
  }

  const settings = getSettings();
  document.getElementById("speedRange").value = settings.speed;
  document.getElementById("heightRange").value = settings.height;
  document.getElementById("channelsRange").value = settings.channels;

  document.getElementById("speedValue").textContent = settings.speed;
  document.getElementById("heightValue").textContent = settings.height;
  document.getElementById("channelsValue").textContent = settings.channels;

  saveSettings();
});

let port;
let lineBuffer = "";
let isConnected = false;
let isStreaming = false;
let isRecording = false;

function startStreaming() {
  isStreaming = true;
  document.getElementById("recordSaveButton").disabled = false;

  // Resume SmoothieCharts streaming
  for (var i = 0; i < smoothieCharts.length; i++) {
    smoothieCharts[i].start();
  }
}

// Function to stop streaming
function stopStreaming() {
  isStreaming = false;
  document.getElementById("recordSaveButton").disabled = true;
  // Stop SmoothieCharts streaming
  for (var i = 0; i < smoothieCharts.length; i++) {
    smoothieCharts[i].stop();
  }
}

async function connectToDevice() {
  //   // Show loading indicator
  // document.getElementById("connectButton").textContent = "Connecting...";
  port = await navigator.serial
    .requestPort({})
    .then((port) => {
      console.log("selected port");
      return port;
    })
    .catch((e) => {
      alert("Please Select a Port");
      isConnected = false;
      document.getElementById("connectButton").innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-usb-symbol" viewBox="0 0 16 16">
      <path d="m7.792.312-1.533 2.3A.25.25 0 0 0 6.467 3H7.5v7.319a2.5 2.5 0 0 0-.515-.298L5.909 9.56A1.5 1.5 0 0 1 5 8.18v-.266a1.5 1.5 0 1 0-1 0v.266a2.5 2.5 0 0 0 1.515 2.298l1.076.461a1.5 1.5 0 0 1 .888 1.129 2.001 2.001 0 1 0 1.021-.006v-.902a1.5 1.5 0 0 1 .756-1.303l1.484-.848A2.5 2.5 0 0 0 11.995 7h.755a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25v2.5c0 .138.112.25.25.25h.741a1.5 1.5 0 0 1-.747 1.142L8.76 8.99a3 3 0 0 0-.26.17V3h1.033a.25.25 0 0 0 .208-.389L8.208.312a.25.25 0 0 0-.416 0"/>
    </svg>
    `;
      isStreaming = false;
      throw e;
    });
  await port.open({ baudRate: 115200 });

  // Set the color of the connect button to green
  document.getElementById("connectButton").classList.add("connected");

  isConnected = true;
  updateChartLabels();
  startStreaming();
  const reader = port.readable.getReader();
  const decoder = new TextDecoder();
  try {
    while (isConnected) {
      const { value, done } = await reader.read();
      if (done) {
        // Allow the serial port to be closed later.
        console.log("Done reading data.");
        break;
      }
      lineBuffer += decoder.decode(value);
      if (isStreaming) {
        processData();
      }
    }
  } catch (error) {
    console.error("Error connecting to device:", error);
    alert(
      "Error connecting to device: Please remove the device and insert it again."
    );
  } finally {
    console.log("Closing releasing lock");
    reader.releaseLock();
    await port.close();
    port = undefined;
    isConnected = false;
    document.getElementById("connectButton").classList.remove("connected");
    document.getElementById("connectButton").innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-usb-symbol" viewBox="0 0 16 16">
    <path d="m7.792.312-1.533 2.3A.25.25 0 0 0 6.467 3H7.5v7.319a2.5 2.5 0 0 0-.515-.298L5.909 9.56A1.5 1.5 0 0 1 5 8.18v-.266a1.5 1.5 0 1 0-1 0v.266a2.5 2.5 0 0 0 1.515 2.298l1.076.461a1.5 1.5 0 0 1 .888 1.129 2.001 2.001 0 1 0 1.021-.006v-.902a1.5 1.5 0 0 1 .756-1.303l1.484-.848A2.5 2.5 0 0 0 11.995 7h.755a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25v2.5c0 .138.112.25.25.25h.741a1.5 1.5 0 0 1-.747 1.142L8.76 8.99a3 3 0 0 0-.26.17V3h1.033a.25.25 0 0 0 .208-.389L8.208.312a.25.25 0 0 0-.416 0"/>
  </svg>
  `;
    updateChartLabels("No device connected!"); // Reset badge text
  }
}

function updateChartLabels(status = null) {
  const channels = parseInt(localStorage.getItem("channelsValue")) || 1;
  for (let i = 0; i < channels; i++) {
    const badge = document.querySelector(`#parent-${i} .badge`);
    if (badge) {
      badge.textContent = status || `CH${i + 1}`;
    }
  }
}

document.getElementById("connectButton").addEventListener("click", async () => {
  if (isConnected) {
    isConnected = false;
    if (port) {
      const reader = port.readable.getReader();
      reader.cancel();
      reader.releaseLock();
      await port.close();
      port = undefined;
    }
    document.getElementById("connectButton").innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-usb-symbol" viewBox="0 0 16 16">
    <path d="m7.792.312-1.533 2.3A.25.25 0 0 0 6.467 3H7.5v7.319a2.5 2.5 0 0 0-.515-.298L5.909 9.56A1.5 1.5 0 0 1 5 8.18v-.266a1.5 1.5 0 1 0-1 0v.266a2.5 2.5 0 0 0 1.515 2.298l1.076.461a1.5 1.5 0 0 1 .888 1.129 2.001 2.001 0 1 0 1.021-.006v-.902a1.5 1.5 0 0 1 .756-1.303l1.484-.848A2.5 2.5 0 0 0 11.995 7h.755a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25v2.5c0 .138.112.25.25.25h.741a1.5 1.5 0 0 1-.747 1.142L8.76 8.99a3 3 0 0 0-.26.17V3h1.033a.25.25 0 0 0 .208-.389L8.208.312a.25.25 0 0 0-.416 0"/>
  </svg>
  `;
    document.getElementById("connectButton").classList.remove("connected");

    isStreaming = false;
    isRecording = false;
    recordSaveButton.disabled = true;
    updateChartLabels("No device connected!"); // Update badge text
  } else {
    await connectToDevice();
  }
});

document
  .getElementById("recordSaveButton")
  .addEventListener("click", async () => {
    if (!isRecording) {
      isRecording = true;
      document.getElementById("recordSaveButton").innerHTML = `
    <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    class="bi bi-download"
    viewBox="0 0 16 16"
  >
    <path
      d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"
    />
    <path
      d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"
    />
  </svg>
  `;
    } else if (isRecording) {
      isRecording = false;
      document.getElementById("recordSaveButton").innerHTML = `
    <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="red"
    class="bi bi-record"
    viewBox="0 0 16 16"
  >
    <path d="M8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
  </svg>
  `;
      await save_csv();
    }
  });

// Download CSV file return db;
async function save_csv() {
  const fileHandle = await getNewFileHandle();
  const writableStream = await fileHandle.createWritable();
  const columnNames = [
    "Counter",
    "Time",
    "Channel 1",
    "Channel 2",
    "Channel 3",
    "Channel 4",
    "Channel 5",
    "Channel 6",
  ];
  const headerRow = columnNames.join(",") + "\n";
  await writableStream.write(headerRow);

  const db = await idb.openDB("adcReadings", 1);
  const readableStream = makeReadableStream(db, "adcReadings");
  await readableStream.pipeTo(writableStream);

  indexedDB.deleteDatabase("adcReadings");
}

var buffer = [];
async function dbstuff(data) {
  const request = indexedDB.open("adcReadings", 1);

  // Handle the database creation or upgrade event
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    // Create an object store if it doesn't exist
    if (!db.objectStoreNames.contains("adcReadings")) {
      db.createObjectStore("adcReadings", {
        keyPath: "id",
        autoIncrement: true,
      });
    }
  };
  // Wait for the database to open
  const db = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // Start a transaction to access the object store
  const tx = db.transaction(["adcReadings"], "readwrite");
  tx.onerror = (event) => {
    console.error("Error starting transaction:", event.target.error);
  };
  const store = tx.objectStore("adcReadings");

  // Add ADC data to the object store
  for (let i = 0; i < data.length; i++) {
    store.add({
      counter: data[i][0],
      time: data[i][1],
      channel_1: data[i][2],
      channel_2: data[i][3],
      channel_3: data[i][4],
      channel_4: data[i][5],
      channel_5: data[i][6],
      channel_6: data[i][7],
    });
  }
  if (fileBreak) {
    store.add({
      counter: -1,
      time: -1,
      channel_1: -1,
      channel_2: -1,
      channel_3: -1,
      channel_4: -1,
      channel_5: -1,
      channel_6: -1,
    });
    fileBreak = false;
  }
  // Wait for the transaction to complete
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
var current_packet = 0;
var modal = new bootstrap.Modal(document.getElementById("saveModal"));
const queuingStrategy = new CountQueuingStrategy({ highWaterMark: 250 });
const makeReadableStream = (db, store) => {
  modal.show();
  let prevKey;
  return new ReadableStream(
    {
      async pull(controller) {
        const range =
          prevKey !== undefined
            ? IDBKeyRange.lowerBound(prevKey, true)
            : undefined;

        const MIN_BATCH_SIZE = 1000;
        let batchCount = 0;

        let cursor = await db
          .transaction(store, "readonly")
          .objectStore(store)
          .openCursor(range);

        while (cursor) {
          const data = cursor.value;
          const csvRow = `${data.counter},${data.time},${data.channel_1},${data.channel_2},${data.channel_3},${data.channel_4},${data.channel_5},${data.channel_6}\n`;
          controller.enqueue(csvRow);
          prevKey = cursor.key;
          batchCount += 1;

          if (controller.desiredSize > 0 || batchCount < MIN_BATCH_SIZE) {
            cursor = await cursor.continue();
          } else {
            break;
          }
        }
        current_packet = current_packet + 1;
        console.log(buffer_counter);
        console.log(
          `Processed ${batchCount} objects, packet number ${current_packet}`
        );
        var width = ((current_packet * 4) / buffer_counter) * 100;
        document
          .getElementById("dynamic")
          .setAttribute("style", "width: " + width + "%");

        if (!cursor) {
          // No more data
          console.log(`Completely done. Processed ${batchCount} objects`);
          document
            .getElementById("dynamic")
            .setAttribute("style", "width: 100%");

          document.getElementById("saveModalLabel").innerHTML =
            "Saving Complete!";
          setTimeout(() => {
            modal.hide();
          }, 1000);
          controller.close();
        }
      },
    },
    {
      queuingStrategy,
    }
  );
};

const getNewFileHandle = async () => {
  const opts = {
    suggestedName: "readings.csv",
    types: [
      {
        description: "Text Files",
        accept: {
          "text/csv": [".csv"],
        },
      },
    ],
  };
  return await window.showSaveFilePicker(opts);
};
// Process incoming data from external device
var buffer_counter = 0;
function processData() {
  let lines = lineBuffer.split("\r\n");
  lineBuffer = lines.pop();

  for (let line of lines) {
    // array of integers
    let lineData = line;
    let dataArray = lineData.split(",");
    let parsedData = dataArray.map((str) => parseInt(str));
    // Append the parsed data to recordedData array if recording is enabled
    buffer.push(parsedData);

    if (buffer.length > 250) {
      var secondaryBuffer = buffer;
      if (isRecording) {
        dbstuff(secondaryBuffer);
      }
      buffer = [];
      buffer_counter = buffer_counter + 1;
    }

    // Append the parsed data to the chart
    var channels = parseInt(localStorage.getItem("channelsValue")) || 6;
    for (var i = 0; i < channels; i++) {
      const data = parsedData[i + 2];
      if (!isNaN(data)) {
        timeSeries[i].append(Date.now(), data);
      }
    }
  }
}
