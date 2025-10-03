// Declarative Pipeline for building Node.js application and running SonarQube analysis triggered by a push event.
pipeline {
    // Defines the execution environment. Using 'agent any' to ensure an agent is available.
    agent any 

    // Global environment variable to store the path to the manually installed scanner.
    environment {
        SONAR_SCANNER_PATH = ''
    }

    stages {
        // Stage 1: Checkout the code (Relies on the initial SCM checkout done by Jenkins)
        stage('Source Checkout') {
            steps {
                echo "Workspace already populated by the initial SCM checkout. Proceeding."
            }
        }

        // Stage 2: Setup Node.js v20, install pnpm, and MANUALLY install Sonar Scanner
        stage('Setup Environment and Tools') {
            steps {
                sh '''
                    echo "Ensuring required utilities and Node.js are installed..."
                    sudo apt-get update
                    sudo apt-get install -y curl unzip nodejs
                    
                    # 1. Install Node.js v20 
                    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                    echo "Node.js version: \$(node -v)"
                    
                    # 2. Install pnpm globally (version 8)
                    npm install -g pnpm@8
                    echo "pnpm version: \$(pnpm -v)"
                '''

                // --- MANUALLY INSTALL THE SONAR SCANNER CLI (FIXED GROOVY SCOPE) ---
                script {
                    sh """
                        echo "Manually downloading and installing Sonar Scanner CLI..."
                        
                        # Download the stable scanner CLI package
                        curl -sS -o sonar-scanner.zip \
                        "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.7.0.2747.zip"
                        
                        unzip -q sonar-scanner.zip -d .
                        
                        # Find the extracted directory name 
                        def scannerDir = \$(find . -maxdepth 1 -type d -name "sonar-scanner*" | head -n 1)
                        
                        echo "Scanner extracted to: \${scannerDir}"
                        
                        # Set the global environment variable (SONAR_SCANNER_PATH) 
                        // This allows us to run the scanner by full path in the next stage
                        echo "SONAR_SCANNER_PATH=\${scannerDir}/bin" > .scanner_path.env
                    """
                    // Load the environment variable set by the shell script 
                    // This is the correct way to pass shell variables back to Groovy/Jenkins environment
                    def scannerPath = readProperties file: '.scanner_path.env'
                    env.SONAR_SCANNER_PATH = "${env.WORKSPACE}/${scannerPath.SONAR_SCANNER_PATH}"
                    
                    echo "Global Sonar Path set to: ${env.SONAR_SCANNER_PATH}"
                }
            }
        }

        // Stage 3: Install dependencies and build the application
        stage('Install and Build') {
            steps {
                sh 'pnpm install'
                sh 'pnpm run build'
            }
        }

        // Stage 4: Run SonarQube analysis using the plugin's variables and the manual path.
        stage('SonarQube Analysis') {
            steps {
                script {
                    // 1. Get the short 8-character commit SHA for project versioning
                    def commitShaShort = sh(returnStdout: true, script: 'git rev-parse --short=8 HEAD').trim()
                    echo "Commit SHA (short) is: ${commitShaShort}"
                    
                    // 2. Use withSonarQubeEnv to set up the secure variables (HOST and TOKEN)
                    // The 'SonarQube-Server' name is used as per your previous log.
                    withSonarQubeEnv(installationName: 'SonarQube-Server') {
                        // 3. Execute the scanner using the manually determined full path.
                        // We rely on the sonar-project.properties file for the project key.
                        sh """
                            echo "Starting SonarQube Analysis for project version: ${commitShaShort}"
                            
                            \${SONAR_SCANNER_PATH}/sonar-scanner \\
                                -Dsonar.projectVersion=${commitShaShort} \\
                                -Dsonar.sources=.
                                
                            # SONAR_HOST_URL and SONAR_TOKEN are automatically passed as environment variables
                            # by the withSonarQubeEnv block.
                        """
                    }
                }
            }
        }
    }
}
