package com.raz.ecg;

import com.fazecast.jSerialComm.SerialPort;
import com.raz.ecg.Services.SerialService;
import javafx.animation.AnimationTimer;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.geometry.Pos;
import javafx.geometry.Insets;
import javafx.stage.Stage;

public class App extends Application {
    // Constantes ajustadas
    private static final int BUFFER_SIZE = 1000;
    private static final int ARRHYTHMIA_BUFFER_SIZE = 1000;
    private static final double GAIN = 1.2;
    private static final double ARRHYTHMIA_GAIN = 1.0;
    private static final double LINE_WIDTH = 1.5;
    private static final int DISPLAYED_SAMPLES = 800;
    private static final int GRID_SPACING = 50;
    private static final int QRS_THRESHOLD = 25;
    private static final int MIN_HEART_RATE = 40;
    private static final int MAX_HEART_RATE = 180;
    private static final int PORT_CHECK_INTERVAL = 3000;
    private static final int DATA_TIMEOUT = 2000;

    private int BASE_LINE = 512;
    private final SerialService serialService = new SerialService();
    private final int[] ecgBuffer = new int[BUFFER_SIZE];
    private final int[] arrhythmiaBuffer = new int[ARRHYTHMIA_BUFFER_SIZE];
    private int bufferIndex = 0;
    private int arrhythmiaIndex = 0;
    private int heartRate = 0;
    private int irregularBeatsCount = 0;
    private long lastQrsTime = 0;
    private boolean electrodesConnected = true;
    private boolean portDisconnected = false;
    private long lastDataTime = 0;
    private String currentPort = "";

    // Componentes de la interfaz
    private Canvas ecgCanvas;
    private Canvas arrhythmiaCanvas;
    private GraphicsContext gc;
    private GraphicsContext arrhythmiaGc;
    private Label statusLabel;
    private Label hrLabel;
    private Label irregularBeatLabel;
    private Label electrodeLabel;
    private Label portStatusLabel;
    private ComboBox<String> portComboBox;
    private ImageView logoView;

    @Override
    public void start(Stage stage) {
        try {
            Image logo = new Image(getClass().getResourceAsStream("/com/raz/ecg/assets/cardiogram.png"));
            logoView = new ImageView(logo);
            logoView.setFitHeight(40);
            logoView.setPreserveRatio(true);
        } catch (Exception e) {
            logoView = new ImageView();
        }

        // Configuración de componentes
        portComboBox = new ComboBox<>();
        portComboBox.setStyle("-fx-background-color: #333344; -fx-text-fill: white; -fx-font-size: 14px;");

        Button connectButton = createModernButton("CONECTAR", "#27ae60");
        Button disconnectButton = createModernButton("DESCONECTAR", "#e74c3c");
        connectButton.setOnAction(e -> connect());
        disconnectButton.setOnAction(e -> disconnect());

        // Etiquetas más grandes
        statusLabel = new Label("SISTEMA ECG - DESCONECTADO");
        statusLabel.setStyle("-fx-text-fill: #ecf0f1; -fx-font-size: 18px; -fx-font-weight: bold;");
        
        electrodeLabel = new Label("ELECTRODOS: --");
        electrodeLabel.setStyle("-fx-text-fill: #2ecc71; -fx-font-size: 18px; -fx-font-weight: bold;");
        
        portStatusLabel = new Label("ESTADO: DESCONECTADO");
        portStatusLabel.setStyle("-fx-text-fill: #bdc3c7; -fx-font-size: 16px;");

        // Panel de métricas cardíacas (más grandes)
        HBox metricsPanel = new HBox(20);
        metricsPanel.setAlignment(Pos.CENTER);
        
        hrLabel = new Label("--");
        hrLabel.setStyle("-fx-text-fill: #2ecc71; -fx-font-size: 48px; -fx-font-weight: bold;");
        
        irregularBeatLabel = new Label("0");
        irregularBeatLabel.setStyle("-fx-text-fill: #ff6b6b; -fx-font-size: 48px; -fx-font-weight: bold;");

        metricsPanel.getChildren().addAll(
            new VBox(5, new Label("BPM"), hrLabel),
            new VBox(5, new Label("IRREGULARES"), irregularBeatLabel)
        );

        // Configuración de los lienzos (más pequeños)
        ecgCanvas = new Canvas(1000, 300);
        gc = ecgCanvas.getGraphicsContext2D();
        
        arrhythmiaCanvas = new Canvas(1000, 200);
        arrhythmiaGc = arrhythmiaCanvas.getGraphicsContext2D();
        
        clearCanvas();
        clearArrhythmiaCanvas();

        // Barra de control superior
        HBox controlPanel = new HBox(15);
        controlPanel.setStyle("-fx-background-color: linear-gradient(to right, #2c3e50, #34495e);" +
                            "-fx-padding: 10px;" +
                            "-fx-alignment: center;");
        
        controlPanel.getChildren().addAll(
            logoView,
            new VBox(5, new Label("PUERTO COM:"), portComboBox),
            new VBox(5, connectButton, disconnectButton),
            new VBox(5, statusLabel, portStatusLabel),
            metricsPanel,
            electrodeLabel
        );

        // Layout principal
        VBox root = new VBox(10, controlPanel, ecgCanvas, arrhythmiaCanvas);
        root.setStyle("-fx-background-color: #000000; -fx-padding: 10;");

        // Configuración de la ventana
        Scene scene = new Scene(root, 1000, 600);
        stage.setScene(scene);
        stage.setTitle("MONITOR ECG - RAZ");
        stage.setOnCloseRequest(e -> disconnect());
        stage.show();

        // Iniciar bucles
        startRenderLoop();
        startPortCheckLoop();
        refreshPorts();
    }

    private Button createModernButton(String text, String color) {
        Button btn = new Button(text);
        btn.setStyle("-fx-background-color: " + color + ";" +
                    "-fx-text-fill: white;" +
                    "-fx-font-weight: bold;" +
                    "-fx-font-size: 14px;" +
                    "-fx-padding: 8 16;" +
                    "-fx-background-radius: 4px;");
        
        btn.setOnMouseEntered(e -> btn.setStyle("-fx-background-color: derive(" + color + ", 20%);" +
                                             "-fx-text-fill: white;" +
                                             "-fx-font-weight: bold;" +
                                             "-fx-font-size: 14px;" +
                                             "-fx-padding: 8 16;" +
                                             "-fx-background-radius: 4px;"));
        
        btn.setOnMouseExited(e -> btn.setStyle("-fx-background-color: " + color + ";" +
                                            "-fx-text-fill: white;" +
                                            "-fx-font-weight: bold;" +
                                            "-fx-font-size: 14px;" +
                                            "-fx-padding: 8 16;" +
                                            "-fx-background-radius: 4px;"));
        return btn;
    }

    private void startPortCheckLoop() {
        new AnimationTimer() {
            private long lastCheckTime = 0;

            @Override
            public void handle(long now) {
                if (now - lastCheckTime >= PORT_CHECK_INTERVAL * 1_000_000) {
                    lastCheckTime = now;
                    Platform.runLater(() -> {
                        if (System.currentTimeMillis() - lastDataTime > DATA_TIMEOUT && serialService.isConnected()) {
                            portDisconnected = true;
                            statusLabel.setText("¡DESCONEXIÓN DEL PUERTO!");
                            statusLabel.setStyle("-fx-text-fill: #e74c3c;");
                            portStatusLabel.setText("ESTADO: DESCONECTADO");
                            portStatusLabel.setStyle("-fx-text-fill: #e74c3c;");
                        }
                        refreshPorts();
                    });
                }
            }
        }.start();
    }

    private void refreshPorts() {
        Platform.runLater(() -> {
            String currentSelection = portComboBox.getValue();
            portComboBox.getItems().clear();
            
            SerialPort[] ports = SerialPort.getCommPorts();
            for (SerialPort port : ports) {
                portComboBox.getItems().add(port.getSystemPortName());
            }
            
            if (currentSelection != null && portComboBox.getItems().contains(currentSelection)) {
                portComboBox.setValue(currentSelection);
            }
        });
    }

    private void connect() {
        currentPort = portComboBox.getValue();
        if (currentPort != null && !currentPort.isEmpty()) {
            if (serialService.connect(currentPort, this::handleIncomingData)) {
                updateConnectionStatus(true);
                lastDataTime = System.currentTimeMillis();
                portDisconnected = false;
            } else {
                showAlert("Error de conexión", "No se pudo conectar al puerto " + currentPort);
                updateConnectionStatus(false);
            }
        } else {
            showAlert("Selección inválida", "Por favor selecciona un puerto COM válido");
        }
    }

    private void showAlert(String title, String message) {
        Platform.runLater(() -> {
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle(title);
            alert.setHeaderText(null);
            alert.setContentText(message);
            alert.showAndWait();
        });
    }

    private void disconnect() {
        serialService.disconnect();
        updateConnectionStatus(false);
    }

    private void updateConnectionStatus(boolean connected) {
        Platform.runLater(() -> {
            if (connected) {
                statusLabel.setText("CONECTADO: " + currentPort);
                statusLabel.setStyle("-fx-text-fill: #2ecc71;");
                portStatusLabel.setText("ESTADO: CONECTADO");
                portStatusLabel.setStyle("-fx-text-fill: #2ecc71;");
            } else {
                statusLabel.setText("SISTEMA ECG - DESCONECTADO");
                statusLabel.setStyle("-fx-text-fill: #e74c3c;");
                portStatusLabel.setText("ESTADO: DESCONECTADO");
                portStatusLabel.setStyle("-fx-text-fill: #e74c3c;");
            }
        });
    }

    private void handleIncomingData(int value) {
        lastDataTime = System.currentTimeMillis();
        if (portDisconnected) {
            portDisconnected = false;
            updateConnectionStatus(true);
        }
        
        processECGValue(value);
        processArrhythmiaData(value);
        checkElectrodes(value);
        detectQRSComplex(value);
    }

    private void checkElectrodes(int value) {
        boolean isDisconnected = value <= 10 || value >= 1013;
        if (isDisconnected != electrodesConnected) {
            electrodesConnected = !isDisconnected;
            Platform.runLater(() -> {
                electrodeLabel.setText("ELECTRODOS: " + (electrodesConnected ? "CONECTADOS" : "DESCONECTADOS"));
                electrodeLabel.setStyle("-fx-text-fill: " + (electrodesConnected ? "#2ecc71" : "#e74c3c") + ";");
            });
        }
    }

    private void detectQRSComplex(int value) {
        int diff = Math.abs(value - BASE_LINE);
        
        if (diff > QRS_THRESHOLD) {
            long now = System.currentTimeMillis();
            
            if (lastQrsTime > 0) {
                long interval = now - lastQrsTime;
                int detectedBpm = (int) (60000 / interval);
                
                if (detectedBpm >= MIN_HEART_RATE && detectedBpm <= MAX_HEART_RATE) {
                    heartRate = detectedBpm;
                    Platform.runLater(() -> {
                        hrLabel.setText(String.valueOf(heartRate));
                        hrLabel.setStyle("-fx-text-fill: #2ecc71;");
                    });
                }
            }
            lastQrsTime = now;
        }
    }

    private void processECGValue(int value) {
        if (value < 300 || value > 800) {
            value = BASE_LINE;
        }
        
        ecgBuffer[bufferIndex] = value;
        bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
        
        // Ajuste dinámico de la línea base
        if (bufferIndex % 50 == 0) {
            int sum = 0;
            for (int i = 0; i < 50; i++) {
                int idx = (bufferIndex - i + BUFFER_SIZE) % BUFFER_SIZE;
                sum += ecgBuffer[idx];
            }
            BASE_LINE = sum / 50;
        }
    }

    private void processArrhythmiaData(int value) {
        if (value < 300 || value > 800) {
            value = BASE_LINE;
        }
        
        arrhythmiaBuffer[arrhythmiaIndex] = value;
        arrhythmiaIndex = (arrhythmiaIndex + 1) % ARRHYTHMIA_BUFFER_SIZE;
    }

    private void startRenderLoop() {
        new AnimationTimer() {
            @Override
            public void handle(long now) {
                clearCanvas();
                clearArrhythmiaCanvas();
                drawGrid();
                drawArrhythmiaGrid();
                drawECG();
                drawArrhythmiaWave();
            }
        }.start();
    }

    private void drawECG() {
        gc.setStroke(Color.web("#2ecc71"));
        gc.setLineWidth(LINE_WIDTH);
        gc.beginPath();
        
        int start = (bufferIndex - DISPLAYED_SAMPLES + BUFFER_SIZE) % BUFFER_SIZE;
        for (int i = 0; i < DISPLAYED_SAMPLES; i++) {
            int index = (start + i) % BUFFER_SIZE;
            double x = i * (ecgCanvas.getWidth() / DISPLAYED_SAMPLES);
            double y = ecgCanvas.getHeight() / 2 - (ecgBuffer[index] - BASE_LINE) * GAIN;
            
            if (i == 0) gc.moveTo(x, y);
            else gc.lineTo(x, y);
        }
        gc.stroke();
        
        gc.setFill(Color.WHITE);
        gc.setFont(Font.font("Arial", FontWeight.BOLD, 16));
        gc.fillText("ELECTROCARDIOGRAMA", 20, 20);
    }

    private void drawArrhythmiaWave() {
        arrhythmiaGc.setStroke(Color.web("#ff6b6b"));
        arrhythmiaGc.setLineWidth(LINE_WIDTH);
        arrhythmiaGc.beginPath();
        
        int start = (arrhythmiaIndex - DISPLAYED_SAMPLES + ARRHYTHMIA_BUFFER_SIZE) % ARRHYTHMIA_BUFFER_SIZE;
        
        for (int i = 0; i < DISPLAYED_SAMPLES; i++) {
            int index = (start + i) % ARRHYTHMIA_BUFFER_SIZE;
            double x = i * (arrhythmiaCanvas.getWidth() / (double)DISPLAYED_SAMPLES);
            double y = arrhythmiaCanvas.getHeight() / 2 - (arrhythmiaBuffer[index] - BASE_LINE) * ARRHYTHMIA_GAIN;
            
            if (i == 0) arrhythmiaGc.moveTo(x, y);
            else arrhythmiaGc.lineTo(x, y);
        }
        arrhythmiaGc.stroke();
        
        arrhythmiaGc.setFill(Color.WHITE);
        arrhythmiaGc.setFont(Font.font("Arial", FontWeight.BOLD, 16));
        arrhythmiaGc.fillText("ANÁLISIS DE ARRITMIAS", 20, 20);
    }

    private void drawGrid() {
        gc.setStroke(Color.rgb(40, 40, 70));
        gc.setLineWidth(0.5);
        
        for (int x = 0; x < ecgCanvas.getWidth(); x += GRID_SPACING) {
            gc.strokeLine(x, 0, x, ecgCanvas.getHeight());
        }
        for (int y = 0; y < ecgCanvas.getHeight(); y += GRID_SPACING) {
            gc.strokeLine(0, y, ecgCanvas.getWidth(), y);
        }
    }

    private void drawArrhythmiaGrid() {
        arrhythmiaGc.setStroke(Color.rgb(40, 40, 70));
        arrhythmiaGc.setLineWidth(0.5);
        
        for (int x = 0; x < arrhythmiaCanvas.getWidth(); x += GRID_SPACING) {
            arrhythmiaGc.strokeLine(x, 0, x, arrhythmiaCanvas.getHeight());
        }
        for (int y = 0; y < arrhythmiaCanvas.getHeight(); y += GRID_SPACING) {
            arrhythmiaGc.strokeLine(0, y, arrhythmiaCanvas.getWidth(), y);
        }
    }

    private void clearCanvas() {
        gc.setFill(Color.BLACK);
        gc.fillRect(0, 0, ecgCanvas.getWidth(), ecgCanvas.getHeight());
    }

    private void clearArrhythmiaCanvas() {
        arrhythmiaGc.setFill(Color.BLACK);
        arrhythmiaGc.fillRect(0, 0, arrhythmiaCanvas.getWidth(), arrhythmiaCanvas.getHeight());
    }

    public static void main(String[] args) {
        launch(args);
    }
}