/** @param {jQuery} $ jQuery Object */
!function($, window, document, _undefined)
{
	XenForo.FileUploader = function($container)
	{
		var uploader = XenForo.AttachmentUploader($container);

		var $result = $($container.data('result')),
			$progress = $result.find('.Progress'),
			$meter = $progress.find('.Meter'),
			$filename = $result.find('.Filename'),
			$delete = $result.find('.Delete'),
			queueLength = 0,
			swfUpload,
			fileId,

			showContainer = function()
			{
				$container.css(
				{
					overflow: '',
					height: '',
					width: '',
					position: ''
				});
			},
			hideContainer = function()
			{
				$container.css(
				{
					overflow: 'hidden',
					height: '1px',
					width: '1px',
					position: 'relative'
				});
			},

			attachmentErrorHandler = function(e)
			{
				setTimeout(function() {
					if (!$filename.is(':visible'))
					{
						var error = '';
						if (e.ajaxData)
						{
							$.each(e.ajaxData.error, function(i, errorText) { error += errorText + "\n"; });
						}

						var file = e.file,
							id = file.uniqueIdentifier || file.id;

						uploader.swfAlert(file, e.errorCode, error);

						$('#' + id).xfRemove();
						$result.hide();
						showContainer();
					}
				}, 1000);

				if (e.type == 'AttachmentUploadError')
				{
					queueLength--;
				}
			};

		$container.bind(
		{
			AttachmentQueueValidation: function(e)
			{
				if (queueLength >= 1)
				{
					e.preventDefault();
				}
			},

			AttachmentQueued: function(e)
			{
				queueLength++;

				console.log('Queued: %s (%d bytes)', e.file.name, e.file.size);

				hideContainer();
				$filename.hide();
				$meter.css('width', 0);
				$progress.show();
				$result.fadeIn(XenForo.speed.fast);

				$delete.data('attach-queue-event', e);
			},

			AttachmentUploadProgress: function(e)
			{
				console.log('Uploaded %d/%d bytes.', e.bytes, e.file.size);

				var percent = Math.min(100, Math.ceil(e.bytes * 100 / e.file.size));
				$meter.css('width', percent + '%');
			},

			AttachmentQueueError: attachmentErrorHandler,
			AttachmentUploadError: attachmentErrorHandler,

			AttachmentUploaded: function(e)
			{
				var filename = e.ajaxData.filename || e.file.name;
				console.info('Upload of %s completed!', filename);

				hideContainer();
				$result.show();
				$progress.hide();
				$filename.text(filename);
				$filename.show();
				$delete.data('href', e.ajaxData.deleteUrl);

				if (e.file)
				{
					// only do the queue for the swf upload
					queueLength--;
				}

				$delete.removeData('attach-queue-event');
			}
		});

		$delete.bind('click', function(e)
		{
			e.preventDefault();

			if ($delete.data('href'))
			{
				XenForo.ajax(
					$delete.data('href'), {},
					function(ajaxData, textStatus)
					{
						$delete.removeData('href');
						$result.fadeOut(XenForo.speed.fast, function()
						{
							showContainer();
						});
					}
				);
			}
			else
			{
				var queueEvent = $delete.data('attach-queue-event');
				if (queueEvent)
				{
					if (queueEvent.swfUpload)
					{
						queueEvent.swfUpload.cancelUpload(queueEvent.file.id);
					}
					else if (queueEvent.file.flowObj)
					{
						queueEvent.file.cancel();
					}
				}

				$result.fadeOut(XenForo.speed.fast, function()
				{
					showContainer();
				});
			}

		});
	};

	// *********************************************************************

	if (typeof XenForo.AttachmentUploader == 'function')
	{
		XenForo.register('.FileUploader', 'XenForo.FileUploader');
	}

}
(jQuery, this, document);