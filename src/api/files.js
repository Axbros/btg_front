import instance from './request'

/**
 * POST /api/files/upload
 * @param {File|Blob} file
 * @param {'ID_CARD_FRONT'|'ID_CARD_BACK'|'FACE'|'PROFIT'|'TRANSFER'|'OTHER'} [type]
 * @returns {Promise<{ url, attachmentId, originalFilename, fileType }>}
 */
export function uploadFile(file, type = 'OTHER') {
  const formData = new FormData()
  formData.append('file', file)
  return instance
    .post('/files/upload', formData, {
      params: { type },
    })
    .then((res) => res.data)
}

export const FILE_UPLOAD_TYPES = {
  ID_CARD_FRONT: 'ID_CARD_FRONT',
  ID_CARD_BACK: 'ID_CARD_BACK',
  FACE: 'FACE',
  PROFIT: 'PROFIT',
  TRANSFER: 'TRANSFER',
  OTHER: 'OTHER',
}
