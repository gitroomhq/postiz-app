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

        stage('Check Node.js and npm') {
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

        stage('Run Unit Tests') {
            steps {
                sh 'npm test'
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
            junit '**/reports/junit.xml'
            archiveArtifacts artifacts: 'reports/**', fingerprint: true
            cleanWs(cleanWhenNotBuilt: false, notFailBuild: true)
        }
        success {
            echo 'Build completed successfully!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
