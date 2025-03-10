pipeline {
    agent any

    environment {
        NODE_VERSION = '20.17.0'
    }

    stages {
        stage('Checkout Repository') {
            steps {
                checkout scm
            }
        }

        stage('Chechout Node.js and npm') {
            steps {
                script {
                    sh "node -v"
                    sh "npm -v"
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build Project') {
            steps {
                sh 'npm run build'
            }
        }
    }

    post {
        always {
            cleanWs(cleanWhenNotBuilt: false,
                notFailBuild: true)
        }
        success {
            echo 'Build completed successfully!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
