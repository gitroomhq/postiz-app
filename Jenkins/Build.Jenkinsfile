// Declarative Pipeline for building Node.js application and running SonarQube analysis triggered by a push event.
pipeline {
    // Defines the execution environment. Using 'agent any' to ensure an agent is available.
    agent any 

    // Define environment variables for fixed values and credentials needed later
    environment {
        // Sonar Host URL taken from your previous successful log injection
        SONAR_HOST_URL = 'https://sonarqube.ennogelhaus.de/'
        // IMPORTANT: Replace this with the ID of your Jenkins Secret Text credential containing the Sonar Token
        SONAR_TOKEN_CREDENTIAL_ID = 'YOUR_SECRET_TOKEN_ID' 
        // This will hold the path to the downloaded scanner directory later
        SCANNER_HOME = '' 
    }

    stages {
        // Stage 1: Checkout the code (Relies on the initial SCM checkout done by Jenkins)
        stage('Source Checkout') {
            steps {
                echo "Workspace already populated by the initial SCM checkout. Proceeding."
            }
        }

        // Stage 2: Setup Node.js v20 and install pnpm
        stage('Setup Environment') {
            steps {
                // Ensure required utilities are installed (curl, unzip, which is needed for scanner extraction)
                sh '''
                    echo "Ensuring required utilities are installed (curl, unzip)..."
                    sudo apt-get update
                    sudo apt-get install -y curl unzip
                '''
                
                // Install Node.js v20 and pnpm
                sh '''
                    echo "Setting up Node.js v20..."
                    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                    echo "Node.js version: \$(node -v)"
                    
                    echo "Installing pnpm globally..."
                    npm install -g pnpm@8
                    echo "pnpm version: \$(pnpm -v)"
                '''
            }
        }

        // Stage 3: Install dependencies and build the application
        stage('Install and Build') {
            steps {
                sh 'pnpm install'
                sh 'pnpm run build'
            }
        }

        // Stage 4: Manual SonarQube Analysis (Download Scanner + Execute)
        stage('SonarQube Analysis') {
            steps {
                script {
                    // 1. Get the short 8-character commit SHA for project versioning
                    def commitShaShort = sh(returnStdout: true, script: 'git rev-parse --short=8 HEAD').trim()
                    echo "Commit SHA (short) is: ${commitShaShort}"

                    // --- Manual Scanner Installation ---
                    // Download the latest scanner CLI package and extract it into the workspace
                    sh """
                        echo "Downloading Sonar Scanner CLI..."
                        # Using a stable, public download link for the scanner CLI
                        curl -sS -o sonar-scanner.zip \
                        "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.7.0.2747.zip"
                        
                        unzip -q sonar-scanner.zip -d .
                        
                        # Find the extracted directory name (e.g., sonar-scanner-4.7.0.2747)
                        def scannerDir = sh(returnStdout: true, script: 'find . -maxdepth 1 -type d -name "sonar-scanner*" | head -n 1').trim()
                        
                        echo "Scanner extracted to: \${scannerDir}"
                        env.SCANNER_HOME = "\${scannerDir}"
                    """

                    // 2. Use withCredentials to inject the token securely
                    // The token is temporarily available as SONAR_TOKEN_VAR inside this block.
                    withCredentials([string(credentialsId: env.SONAR_TOKEN_CREDENTIAL_ID, variable: 'SONAR_TOKEN_VAR')]) {
                        // 3. Execute sonar-scanner CLI using the direct path
                        sh """
                            echo "Starting SonarQube Analysis for project version: ${commitShaShort}"
                            
                            \${SCANNER_HOME}/bin/sonar-scanner \\
                                -Dsonar.projectVersion=${commitShaShort} \\
                                -Dsonar.sources=. \\
                                -Dsonar.host.url=${env.SONAR_HOST_URL} \\
                                -Dsonar.token=\${env.SONAR_AUTH_TOKEN}
                                # Replace 'YOUR_PROJECT_KEY_HERE' with the unique key for your project in SonarQube.
                        """
                    }
                }
            }
        }
    }
}
