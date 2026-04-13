/**
 * BTG Commission 前端 — 构建与归档 dist/
 *
 * 要求：节点已安装 Node.js 18+（推荐 20 LTS）与 npm，且能访问 npm registry。
 * 若使用 Docker agent，将 agent any 改为：
 *   agent { docker { image 'node:20-bookworm-slim' args '-u root' reuseNode true } }
 *
 * 构建期环境变量（Vite VITE_*）请在 Jenkins Job 中配置「构建环境变量」，
 * 或使用 withCredentials + 写入 .env.production.local（勿把密钥写进仓库）。
 */

pipeline {
  agent any

  options {
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 30, unit: 'MINUTES')
    timestamps()
    disableConcurrentBuilds(abortPrevious: true)
  }

  environment {
    CI = 'true'
    NODE_OPTIONS = '--max-old-space-size=4096'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        sh '''
          set -e
          node -v
          npm -v
          test -f package-lock.json
          npm ci
        '''
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Archive') {
      steps {
        archiveArtifacts(
          artifacts: 'dist/**/*',
          fingerprint: true,
          onlyIfSuccessful: true,
        )
      }
    }
  }

  post {
    always {
      sh 'rm -rf node_modules || true'
    }
    success {
      echo "构建成功：产物见归档 dist/"
    }
    failure {
      echo '构建失败：请查看上方日志'
    }
  }
}
