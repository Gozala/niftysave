import http from "http"

const server = http.createServer(async request => {
  for await (const chunk of request) {
    console.log(chunk.toString())
  }
})

server.listen(9090)
