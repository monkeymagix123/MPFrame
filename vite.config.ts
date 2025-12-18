import path from 'path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { serverConfig } from './server/serverConfig'

export default defineConfig({
    plugins: [
        tsconfigPaths({
            projects: ['./tsconfig.json']
        })
    ],
    root: './public',
    build: {
        outDir: './public/dist',
        sourcemap: true,
        minify: true,
        emptyOutDir: true
    },
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, 'shared')
        }
    },
    server: {
        port: 3000,
        fs: {
            allow: ['..']
        },
        proxy: {
            '/socket.io': {
                target: `http://localhost:${serverConfig.port}`,
                changeOrigin: true
            }
        }
    },
    
})