pipeline {
    agent any

    environment {
        NODE_VERSION = '20.17.0'
        PR_NUMBER = "${env.CHANGE_ID}" // PR number from webhook
        IMAGE_TAG = "xtremeverveacr.azurecr.io/postiz-app-pr:${env.CHANGE_ID}"
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

        stage('Build Project') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Build and Push Docker Image to ACR') {
            when {
                expression { return env.CHANGE_ID != null }  // Only for pull requests
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'acr-creds',
                        usernameVariable: 'ACR_USERNAME',
                        passwordVariable: 'ACR_PASSWORD'
                    )
                ]) {
                    sh '''
                        echo "$ACR_PASSWORD" | docker login xtremeverveacr.azurecr.io -u "$ACR_USERNAME" --password-stdin
                        docker build -f Dockerfile.dev -t $IMAGE_TAG .
                        docker push $IMAGE_TAG
                    '''
                }
            }
        }
    }

    post {
        success {
            echo '✅ Build and push succeeded!'
        }
        failure {
            echo '❌ Build or push failed.'
        }
    }
}
