// Declarative Pipeline for building Node.js application and running SonarQube analysis triggered by a push event.
pipeline {
    // Defines the execution environment. Using 'agent any' to ensure an agent is available.
    agent any 

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
                    # We are using the package manager approach which we fixed earlier
                    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                    
                    echo "Node.js version: \$(node -v)"
                    
                    # 2. Install pnpm globally (version 8)
                    npm install -g pnpm@8
                    echo "pnpm version: \$(pnpm -v)"
                '''

                // --- MANUALLY INSTALL THE SONAR SCANNER CLI ---
                // We do this to work around the path injection failure of the SonarQube plugin.
                script {
                    sh """
                        echo "Manually downloading and installing Sonar Scanner CLI..."
                        # Download the stable scanner CLI package
                        curl -sS -o sonar-scanner.zip \
                        "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.7.0.2747.zip"
                        
                        unzip -q sonar-scanner.zip -d .
                        
                        # Find the extracted directory name 
                        def scannerDir = sh(returnStdout: true, script: 'find . -maxdepth 1 -type d -name "sonar-scanner*" | head -n 1').trim()
                        
                        # Add the scanner's bin directory to the execution PATH for subsequent steps
                        echo "Adding ${scannerDir}/bin to PATH"
                        env.PATH = "\$PATH:\$PWD/${scannerDir}/bin"
                    """
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

        // Stage 4: Run SonarQube analysis using the plugin's variables but the manually added executable path.
        stage('SonarQube Analysis') {
            steps {
                script {
                    // 1. Get the short 8-character commit SHA for project versioning
                    def commitShaShort = sh(returnStdout: true, script: 'git rev-parse --short=8 HEAD').trim()
                    echo "Commit SHA (short) is: ${commitShaShort}"
                    
                    // 2. Use withSonarQubeEnv to set up the secure variables (which worked last time)
                    // IMPORTANT: Replace 'YOUR_SONAR_INSTALLATION_NAME' 
                    withSonarQubeEnv(installationName: 'SonarQube-Server') {
                        // 3. Execute sonar-scanner CLI (which is now in PATH)
                        sh """
                            echo "Starting SonarQube Analysis for project version: ${commitShaShort}"
                            # SONAR_HOST_URL and SONAR_TOKEN are injected by withSonarQubeEnv
                            sonar-scanner \\
                                -Dsonar.projectVersion=${commitShaShort} \\
                                -Dsonar.sources=.
                        """
                    }
                }
            }
        }
    }
}
