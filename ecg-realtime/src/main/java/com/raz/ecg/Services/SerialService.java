package com.raz.ecg.Services;

import com.fazecast.jSerialComm.SerialPort;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import java.util.function.IntConsumer;

public class SerialService {
    private SerialPort serialPort;
    private Thread readThread;
    private boolean running = false;

    public boolean connect(String portDescriptor, IntConsumer onDataReceived) {
        disconnect(); // Cerrar cualquier conexión previa

        serialPort = SerialPort.getCommPort(portDescriptor);
        serialPort.setBaudRate(115200);
        serialPort.setComPortTimeouts(SerialPort.TIMEOUT_READ_SEMI_BLOCKING, 1000, 0);

        if (serialPort.openPort()) {
            System.out.println("Conectado al puerto: " + portDescriptor);
            startReading(onDataReceived);
            return true;
        } else {
            System.err.println("Error al conectar al puerto: " + portDescriptor);
            return false;
        }
    }

    private void startReading(IntConsumer onDataReceived) {
        running = true;
        readThread = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(serialPort.getInputStream()))) {
                
                System.out.println("Iniciando lectura de datos...");
                
                while (running) {
                    String line = reader.readLine();
                    if (line == null) continue;

                    line = line.trim();
                    
                    try {
                        int value;
                        if (line.startsWith("ECG:")) {
                            value = Integer.parseInt(line.substring(4).trim());
                        } else if (line.matches("\\d+")) {
                            value = Integer.parseInt(line);
                        } else {
                            continue;
                        }
                        
                        onDataReceived.accept(value);
                    } catch (NumberFormatException e) {
                        System.err.println("Error al procesar dato: " + line);
                    }
                }
            } catch (IOException e) {
                if (running) {
                    System.err.println("Error en lectura serial: " + e.getMessage());
                }
            }
        });

        readThread.setDaemon(true);
        readThread.start();
    }

    public void disconnect() {
        running = false;
        
        if (readThread != null) {
            try {
                readThread.join(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        if (serialPort != null && serialPort.isOpen()) {
            serialPort.closePort();
            System.out.println("Puerto serial cerrado");
        }
    }

    public boolean isConnected() {
        return serialPort != null && serialPort.isOpen() && running;
    }
}