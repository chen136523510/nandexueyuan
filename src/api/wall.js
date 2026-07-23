import request from './index'

export function listPosts() {
  return request.get('/wall/posts')
}

export function createPost(formData) {
  return request.post('/wall/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deletePost(id) {
  return request.delete(`/wall/posts/${id}`)
}

export function createComment(postId, content) {
  return request.post(`/wall/posts/${postId}/comments`, { content })
}

export function deleteComment(id) {
  return request.delete(`/wall/comments/${id}`)
}

export function likePost(postId) {
  return request.post(`/wall/posts/${postId}/like`)
}

export function unlikePost(postId) {
  return request.delete(`/wall/posts/${postId}/like`)
}
