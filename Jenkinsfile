pipeline {
    agent any

    environment {
        // Define your Docker Hub credentials ID here
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'
        IMAGE_NAME = 'veerudsai/todolist-app'
        IMAGE_TAG = "${env.BUILD_ID}"
        // SonarQube installation name defined in Jenkins
        SONAR_SCANNER_HOME = tool 'SonarQubeScanner'
    }

    stages {
        stage('Checkout') {
            steps {
                // Checkout the source code from Git
                checkout scm
            }
        }

        stage('Dependency Check') {
            steps {
                echo 'Running NPM Audit for Vulnerability/Security Checks...'
                // Install dependencies
                bat 'npm install' // use 'sh' if on Linux/macOS Jenkins
                // Run npm audit. Using --audit-level=high so it doesn't fail on minor issues.
                bat 'npm audit --audit-level=high'

                echo 'Running OWASP Dependency-Check CLI...'
                // Run OWASP Dependency-Check using the local CLI tool.
                // If the CLI is not present, it is downloaded dynamically.
                bat '''
                    @echo off
                    if not exist "C:\\ProgramData\\dependency-check\\bin\\dependency-check.bat" (
                        echo Downloading Dependency-Check CLI...
                        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/dependency-check/DependencyCheck/releases/download/v9.0.9/dependency-check-9.0.9-release.zip' -OutFile 'C:\\ProgramData\\dependency-check.zip'"
                        echo Extracting Dependency-Check CLI...
                        powershell -Command "Expand-Archive -Path 'C:\\ProgramData\\dependency-check.zip' -DestinationPath 'C:\\ProgramData' -Force"
                        del "C:\\ProgramData\\dependency-check.zip"
                    )
                    echo Running Dependency-Check Analysis...
                    if not exist "dependency-check-report" mkdir dependency-check-report
                    "C:\\ProgramData\\dependency-check\\bin\\dependency-check.bat" --scan ./ --format XML --format HTML --out dependency-check-report --project To-Do-List-App || exit /b 0
                '''
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube Analysis...'
                withSonarQubeEnv('SonarQube') { // 'SonarQube' should match the server name in Jenkins settings
                    // Use 'sh' on Linux, 'bat' on Windows
                    bat "${SONAR_SCANNER_HOME}\\bin\\sonar-scanner.bat"
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker Image...'
                script {
                    // Build the Docker image
                    dockerImage = docker.build("${IMAGE_NAME}:${IMAGE_TAG}")
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                echo 'Pushing Docker Image to Registry...'
                script {
                    // Ensure you have configured 'docker-hub-credentials' in Jenkins
                    docker.withRegistry('', DOCKER_CREDENTIALS_ID) {
                        dockerImage.push()
                        dockerImage.push('latest') // Also tag and push as latest
                    }
                }
            }
        }


    }

    post {
        always {
            echo 'Pipeline completed. Cleaning up workspace...'
            cleanWs()
        }
        success {
            echo 'CI/CD Pipeline executed successfully!'
        }
        failure {
            echo 'CI/CD Pipeline failed. Please check the logs.'
        }
    }
}
