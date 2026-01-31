import { useNavigate } from 'react-router-dom'
import { getThumbUrl } from '../utils/imageUrl'
import './PhotoCard.css'

function PhotoCard({ photo }) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/photo/${photo.id}`)
  }

  // 优先使用数据库中的缩略图，否则使用原图生成缩略图
  const thumbUrl = photo.thumbnail_url || getThumbUrl(photo.oss_url || photo.image)

  return (
    <div className="photo-card" onClick={handleClick}>
      <div className="photo-image-container">
        <img src={thumbUrl} alt={photo.title} className="photo-image" />
        {Array.isArray(photo.tags) && photo.tags.length > 0 ? (
          <div className="photo-tag">{photo.tags.filter(Boolean).join(', ')}</div>
        ) : null}
      </div>
      <div className="photo-info">
        <div className="photo-info-left">
          <div className="photo-title">{photo.title}</div>
          <div className="photo-location">{photo.location}</div>
        </div>
      </div>
    </div>
  )
}

export default PhotoCard
