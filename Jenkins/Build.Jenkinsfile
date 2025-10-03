// Declarative Pipeline for building Node.js application and running SonarQube analysis triggered by a push event.
pipeline {
    // Defines the execution environment. Replace 'linux-agent' with your specific agent label.
    agent any

    // Configure options, primarily to ensure full Git history is fetched for SonarQube and versioning.
    options {
        // Skip the default checkout to manage it explicitly and ensure fetch-depth: 0.
        skipDefaultCheckout()
    }

    stages {
        // Stage 1: Checkout the code with full history (fetch-depth: 0)
        stage('Source Checkout') {
            steps {
                script {
                    // This performs a deep clone (fetch-depth: 0)
                    // NOTE: Replace 'YOUR_GIT_CREDENTIALS_ID' with the actual Jenkins credential ID 
                    // that has access to your repository.
                    checkout([
                        $class: 'GitSCM', 
                        branches: [[name: 'HEAD']], 
                        extensions: [
                            [$class: 'WipeWorkspace'], 
                            [$class: 'CleanBeforeCheckout'], 
                            [$class: 'CloneOption', depth: 0, noTags: false, reference: '', shallow: false]
                        ], 
                        userRemoteConfigs: [
                            [credentialsId: 'YOUR_GIT_CREDENTIALS_ID', url: env.GIT_URL ?: ''] // Replace env.GIT_URL if needed
                        ]
                    ])
                }
            }
        }

        // Stage 2: Setup Node.js v20 and install pnpm
        stage('Setup Environment') {
            steps {
                sh '''
                    # Install Node.js v20 (closest matching the specified version '20.17.0')
                    # This uses Nodesource to ensure a specific major version is available.
                    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                    sudo apt-get update
                    sudo apt-get install -y nodejs
                    
                    echo "Node.js version: \$(node -v)"
                    
                    # Install pnpm globally (version 8)
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

        // Stage 4: Retrieve secrets from Vault and run SonarQube analysis
        stage('SonarQube Analysis') {
            steps {
                script {
                    // 1. Get the short 8-character commit SHA for project versioning
                    def commitShaShort = sh(returnStdout: true, script: 'git rev-parse --short=8 HEAD').trim()
                    echo "Commit SHA (short) is: ${commitShaShort}"
                    
                    // 2. Retrieve secrets from HashiCorp Vault using the dedicated plugin binding.
                    withCredentials([
                        // Requires the Jenkins HashiCorp Vault Plugin
                        [$class: 'VaultSecretCredentialsBinding',
                         vaultSecrets: [
                             // Map key 'SONAR_TOKEN' from Vault path 'postiz/data/ci/sonar' to Jenkins environment variable 'SONAR_TOKEN'
                             [$class: 'VaultSecret', secretPath: 'postiz/data/ci/sonar', secretKey: 'SONAR_TOKEN', envVar: 'SONAR_TOKEN'],
                             // Map key 'SONAR_HOST_URL' from Vault path 'postiz/data/ci/sonar' to Jenkins environment variable 'SONAR_HOST_URL'
                             [$class: 'VaultSecret', secretPath: 'postiz/data/ci/sonar', secretKey: 'SONAR_HOST_URL', envVar: 'SONAR_HOST_URL']
                         ]]
                    ]) {
                        // 3. Execute sonar-scanner CLI
                        sh """
                            echo "Starting SonarQube Analysis for project version: ${commitShaShort}"
                            sonar-scanner \\
                                -Dsonar.projectVersion=${commitShaShort} \\
                                -Dsonar.token=\${SONAR_TOKEN} \\
                                -Dsonar.host.url=\${SONAR_HOST_URL}
                                # Add other analysis properties here if needed (e.g., -Dsonar.projectKey=...)
                        """
                    }
                }
            }
        }
    }
}
