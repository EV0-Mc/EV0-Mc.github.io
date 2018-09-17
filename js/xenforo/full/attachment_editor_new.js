/** @param {jQuery} $ jQuery Object */
!function($, window, document, _undefined)
{
	// *********************************************************************

	var insertSpeed = XenForo.speed.normal,
		removeSpeed = XenForo.speed.fast;

	XenForo.AttachmentUploader = function($container)
	{
		var ERRORS = {
			TOO_LARGE: 110,
			EMPTY: 120,
			INVALID_EXTENSION: 130
		};

		var $trigger = $($container.data('trigger')),
			$form = $container.closest('form'),
			postParams = {},
			attachmentErrorAlert = function(file, errorCode, message)
			{
				var messageText = $container.data('err-' + errorCode) || message;

				if (!messageText)
				{
					messageText = $container.data('err-unknown');
				}

				if (file)
				{
					XenForo.alert(messageText + '<br /><br />' + XenForo.htmlspecialchars(file.name));
				}
				else
				{
					XenForo.alert(messageText);
				}
			},
			maxFileSize = $container.data('maxfilesize'),
			maxUploads = $container.data('maxuploads'),
			extensions = $container.data('extensions'),
			uniqueKey = $container.data('uniquekey');

		extensions = extensions.replace(/[;*.]/g, '')
			.replace(/,{2,}/g, ',')
			.replace(/^,+/, '').replace(/,+$/, '');

		// --------------------------------------

		// un-hide the upload button
		$container.show();

		var flow;

		if (window.Flow)
		{
			var useFusty = false;

			var flowOptions = {
				target: $container.data('action'),
				allowDuplicateUploads: true,
				fileParameterName: $container.data('postname'),
				query: function()
				{
					var params = $.extend({
						_xfToken: XenForo._csrfToken,
						_xfNoRedirect: 1,
						_xfResponseType: useFusty ? 'json-text' : 'json'
					}, postParams);

					$container.find('.HiddenInput').each(function(i, element)
					{
						var $element = $(element);
						params[$element.data('name')] = $element.data('value');
					});

					return params;
				},
				simultaneousUploads: 1,
				testChunks: false,
				chunkSize: 4 * 1024 * 1024 * 1024 // always one chunk
			};

			flow = new Flow(flowOptions);
			if (!flow.support)
			{
				flow = new FustyFlow(flowOptions);
				useFusty = true;
			}

			var $flowTarget = $('<span />').insertAfter($trigger).append($trigger);

			flow.assignBrowse($flowTarget[0], false, false, {
				accept: '.' + extensions.toLowerCase().replace(/,/g, ',.')
			});

			if (useFusty)
			{
				var outerWidth = $trigger.outerWidth();
				if (outerWidth > 30)
				{
					$flowTarget.css('width', outerWidth);
				}
			}

			$trigger.on('click BeforeOverlayTrigger', function(e)
			{
				e.preventDefault();
			});

			flow.on('fileAdded', function(file)
			{
				var isImage = false;

				// for improved swfupload compat
				file.id = file.uniqueIdentifier;

				switch (file.name.substr(file.name.lastIndexOf('.')).toLowerCase())
				{
					case '.jpg':
					case '.jpeg':
					case '.jpe':
					case '.png':
					case '.gif':
						isImage = true;
				}

				var event = $.Event('AttachmentQueueValidation');
				event.file = file;
				event.flow = flow;
				event.isImage = isImage;
				$container.trigger(event);

				if (event.isDefaultPrevented())
				{
					return false;
				}

				if (file.size > maxFileSize && !isImage) // allow web images to bypass the file size check, as they (may) be resized on the server
				{
					attachmentErrorAlert(file, ERRORS.TOO_LARGE);
					return false;
				}

				event = $.Event('AttachmentQueued');
				event.file = file;
				event.flow = flow;
				event.isImage = isImage;
				$container.trigger(event);
			});
			flow.on('filesSubmitted', function() { flow.upload(); });
			flow.on('fileProgress', function(file)
			{
				// for improved swfupload compat
				file.id = file.uniqueIdentifier;

				$container.trigger(
				{
					type: 'AttachmentUploadProgress',
					file: file,
					bytes: Math.round(file.progress() * file.size),
					flow: flow
				});
			});
			flow.on('fileSuccess', function(file, message)
			{
				try
				{
					if (useFusty && message.substr(0, 1) == '<')
					{
						message = $($.parseHTML(message)).text();
					}

					var ajaxData = $.parseJSON(message);
				}
				catch (e)
				{
					console.warn(e);
					return;
				}

				// for improved swfupload compat
				file.id = file.uniqueIdentifier;

				if (ajaxData.error)
				{
					$container.trigger({
						type: 'AttachmentUploadError',
						file: file,
						ajaxData: ajaxData,
						flow: flow
					});
				}
				else
				{
					$container.trigger({
						type: 'AttachmentUploaded',
						file: file,
						ajaxData: ajaxData,
						flow: flow
					});
				}
			});
			flow.on('fileError', function(file, message)
			{
				var errorCode = 0;

				// for improved swfupload compat
				file.id = file.uniqueIdentifier;

				$container.trigger({
					type: 'AttachmentUploadError',
					file: file,
					errorCode: errorCode,
					message: message,
					ajaxData: { error: [ $container.data('err-unknown') ] },
					flow: flow
				});
			});
		}
		else
		{
			console.error('flow.js must be loaded');
		}

		/**
		 * Bind to the AutoInlineUploadEvent of the document, just in case SWFUpload failed
		 */
		$(document).bind('AutoInlineUploadComplete', function(e)
		{
			if (uniqueKey && e.ajaxData && uniqueKey !== e.ajaxData.key)
			{
				return false;
			}

			var $target = $(e.target);

			if ($target.is('form.AttachmentUploadForm'))
			{
				if ($trigger.overlay())
				{
					$trigger.overlay().close();
				}

				$container.trigger({
					type: 'AttachmentUploaded',
					ajaxData: e.ajaxData
				});

				return false;
			}
		});

		return {
			getSwfUploader: function()
			{
				return null;
			},
			getFlowUploader: function()
			{
				return flow;
			},
			swfAlert: attachmentErrorAlert,
			attachmentErrorAlert: attachmentErrorAlert
		};
	};

	// *********************************************************************

	XenForo.AttachmentEditor = function($editor)
	{
		this.setVisibility = function(instant)
		{
			var $hideElement = $editor.closest('.ctrlUnit'),
				$insertAll = $editor.find('.AttachmentInsertAllBlock'),
				$files = $editor.find('.AttachedFile:not(#AttachedFileTemplate)'),
				$images = $files.filter('.AttachedImage');

			console.log('Attachments changed, total files: %d, images: %d', $files.length, $images.length);

			if ($hideElement.length == 0)
			{
				$hideElement = $editor;
			}

			if (instant === true)
			{
				if ($files.length)
				{
					if ($images.length > 1)
					{
						$insertAll.show();
					}
					else
					{
						$insertAll.hide();
					}

					$hideElement.show();
				}
				else
				{
					$hideElement.hide();
				}
			}
			else
			{
				if ($files.length)
				{
					if ($images.length > 1)
					{
						if ($hideElement.is(':hidden'))
						{
							$insertAll.show();
						}
						else
						{
							$insertAll.xfFadeDown(XenForo.speed.fast);
						}
					}
					else
					{
						if ($hideElement.is(':hidden'))
						{
							$insertAll.hide();
						}
						else
						{
							$insertAll.xfFadeUp(XenForo.speed.fast, false, XenForo.speed.fast, 'swing');
						}
					}

					$hideElement.xfFadeDown(XenForo.speed.normal);
				}
				else
				{
					$insertAll.slideUp(XenForo.speed.fast);

					$hideElement.xfFadeUp(XenForo.speed.normal, false, false, 'swing');
				}
			}
		};

		this.setVisibility(true);

		$('#AttachmentUploader').bind(
		{
			/**
			 * Fires when the upload button is clicked
			 */
			click: function()
			{
				$('textarea.BbCodeWysiwygEditor').each(function() {
					var ed = $(this).data('XenForo.BbCodeWysiwygEditor');
					if (ed)
					{
						ed.blurEditor();
					}
				});
			},

			/**
			 * Fires when a file is added to the upload queue
			 *
			 * @param event Including e.file
			 */
			AttachmentQueued: function(e)
			{
				var file = e.file,
					id = file.uniqueIdentifier || file.id;

				console.info('Queued file %s (%d bytes).', file.name, file.size);

				var $template = $('#AttachedFileTemplate').clone().attr('id', id);

				$template.find('.Filename').text(file.name);
				$template.find('.ProgressCounter').text('0%');
				$template.find('.ProgressGraphic span').css('width', '0%');

				if (e.isImage)
				{
					$template.addClass('AttachedImage');
				}

				$template.xfInsert('appendTo', '.AttachmentList.New', null, insertSpeed);

				$template.find('.AttachmentCanceller').css('display', 'block').click(function()
				{
					if (e.swfUpload)
					{
						e.swfUpload.cancelUpload(e.file.id);
					}
					else if (file.flowObj)
					{
						file.cancel();
					}

					$template.xfRemove(null, function() {
						$editor.trigger('AttachmentsChanged');
					}, removeSpeed, 'swing');
				});

				$editor.trigger('AttachmentsChanged');
			},

			/**
			 * Fires when an upload progress update is received
			 *
			 * @param event Including e.file and e.bytes
			 */
			AttachmentUploadProgress: function(e)
			{
				var file = e.file,
					bytes = e.bytes,
					id = file.uniqueIdentifier || file.id;

				console.log('Uploaded %d/%d bytes.', bytes, file.size);

				var percentNum = Math.min(100, Math.ceil(bytes * 100 / file.size)),
					percentage = percentNum + '%',
					$placeholder = $('#' + id),
					$counter = $placeholder.find('.ProgressCounter'),
					$graphic = $placeholder.find('.ProgressGraphic');

				$counter.text(percentage);
				$graphic.css('width', percentage);

				if (percentNum >= 100)
				{
					$placeholder.find('.AttachmentCanceller').prop('disabled', true).addClass('disabled');
				}

				if ($graphic.width() > $counter.outerWidth())
				{
					$counter.appendTo($graphic);
				}
			},

			/**
			 * Fires if an error occurs during the upload
			 *
			 * @param event
			 */
			AttachmentUploadError: function(e)
			{
				var error = '',
					file = e.file,
					id = file.uniqueIdentifier || file.id;

				$.each(e.ajaxData.error, function(i, errorText) { error += errorText + "\n"; });

				XenForo.alert(error + '<br /><br />' + XenForo.htmlspecialchars(file.name));

				var $attachment = $('#' + id),
					$editor = $attachment.closest('.AttachmentEditor');

				$attachment.xfRemove(null, function() {
					$editor.trigger('AttachmentsChanged');
				}, removeSpeed, 'swing');

				console.warn('AttachmentUploadError: %o', e);
			},

			/**
			 * Fires when a file has been successfully uploaded
			 *
			 * @param event
			 */
			AttachmentUploaded: function(e)
			{
				if (e.file) // SWFupload/flow.js method
				{
					var file = e.file,
						id = file.uniqueIdentifier || file.id,
						$attachment = $('#' + id),
						$attachmentText = $attachment.find('.AttachmentText'),
						$templateHtml = $(e.ajaxData.templateHtml),
						$thumbnail;

					$attachmentText.fadeOut(XenForo.speed.fast, function()
					{
						$templateHtml.find('.AttachmentText').xfInsert('insertBefore', $attachmentText, 'fadeIn', XenForo.speed.fast);

						$thumbnail = $attachment.find('.Thumbnail');
						$thumbnail.html($templateHtml.find('.Thumbnail').html());
						//XenForo.activate($thumbnail);

						$attachmentText.xfRemove();

						$attachment.attr('id', 'attachment' + e.ajaxData.attachment_id);
					});
				}
				else // regular javascript method
				{
					var $attachment = $('#attachment' + e.ajaxData.attachment_id);

					if (!$attachment.length)
					{
						$attachment = $(e.ajaxData.templateHtml).xfInsert('appendTo', $editor.find('.AttachmentList.New'), null, insertSpeed);
					}
				}

				$editor.trigger('AttachmentsChanged');
			}
		});

		var thisVis = $.context(this, 'setVisibility');

		$('#QuickReply').bind('QuickReplyComplete', function(e)
		{
			$editor.find('.AttachmentList.New li:not(#AttachedFileTemplate)').xfRemove().promise().always(thisVis);
		});

		$editor.bind('AttachmentsChanged', thisVis);
	};

	// *********************************************************************

	XenForo.AttachmentInserter = function($trigger)
	{
		$trigger.click(function(e)
		{
			var $attachment = $trigger.closest('.AttachedFile').find('.Thumbnail a'),
				attachmentId = $attachment.data('attachmentid'),
			 	editor,
				bbcode,
				html,
				thumb = $attachment.find('img').attr('src'),
				img = $attachment.attr('href');

			e.preventDefault();

			if ($trigger.attr('name') == 'thumb')
			{
				bbcode = '[ATTACH]' + attachmentId + '[/ATTACH] ';
				html = '<img src="' + thumb + '" class="attachThumb bbCodeImage" alt="attachThumb' + attachmentId + '" /> ';
			}
			else
			{
				bbcode = '[ATTACH=full]' + attachmentId + '[/ATTACH] ';
				html = '<img src="' + img + '" class="attachFull bbCodeImage" alt="attachFull' + attachmentId + '" /> ';
			}

			var editor = XenForo.getEditorInForm($trigger.closest('form'), ':not(.NoAttachment)');
			if (editor)
			{
				if (editor.$editor)
				{
					editor.insertHtml(html);
					var update = editor.$editor.data('xenForoElastic');
					if (update)
					{
						setTimeout(function() { update(); }, 250);
						setTimeout(function() { update(); }, 1000);
					}
				}
				else
				{
					editor.val(editor.val() + bbcode);
				}
			}
		});
	};

	// *********************************************************************

	XenForo.AttachmentDeleter = function($trigger)
	{
		$trigger.css('display', 'block').click(function(e)
		{
			var $trigger = $(e.target),
				href = $trigger.attr('href') || $trigger.data('href'),
				$attachment = $trigger.closest('.AttachedFile'),
				$thumb = $trigger.closest('.AttachedFile').find('.Thumbnail a'),
				attachmentId = $thumb.data('attachmentid');

			if (href)
			{
				$attachment.xfFadeUp(XenForo.speed.normal, null, removeSpeed, 'swing');

				XenForo.ajax(href, '', function(ajaxData, textStatus)
				{
					if (XenForo.hasResponseError(ajaxData))
					{
						$attachment.xfFadeDown(XenForo.speed.normal);
						return false;
					}

					var $editor = $attachment.closest('.AttachmentEditor');

					$attachment.xfRemove(null, function() {
						$editor.trigger('AttachmentsChanged');
					}, removeSpeed, 'swing');
				});

				if (attachmentId)
				{
					var editor = XenForo.getEditorInForm($trigger.closest('form'), ':not(.NoAttachment)');
					if (editor && editor.$editor)
					{
						editor.$editor.find('img[alt=attachFull' + attachmentId + '], img[alt=attachThumb' + attachmentId + ']').remove();
						var update = editor.$editor.data('xenForoElastic');
						if (update)
						{
							update();
						}
					}
				}

				return false;
			}

			console.warn('Unable to locate href for attachment deletion from %o', $trigger);
		});
	};

	// *********************************************************************

	XenForo.AttachmentInsertAll = function($trigger)
	{
		$trigger.click(function()
		{
			$('.AttachmentInserter[name=' + $trigger.attr('name') + ']').each(function(i, input)
			{
				$(input).trigger('click');
			});
		});
	};

	// *********************************************************************

	XenForo.AttachmentDeleteAll = function($trigger)
	{
		$trigger.click(function()
		{
			// TODO: This is a fairly horrible way of doing this, but it's going to be used very infrequently.
			$('.AttachmentDeleter').each(function(i, input)
			{
				$(input).trigger('click');
			});
		});
	};

	// *********************************************************************

	XenForo.register('.AttachmentUploader', 'XenForo.AttachmentUploader');

	XenForo.register('.AttachmentEditor', 'XenForo.AttachmentEditor');

	XenForo.register('.AttachmentInserter', 'XenForo.AttachmentInserter');

	XenForo.register('.AttachmentDeleter', 'XenForo.AttachmentDeleter');

	XenForo.register('.AttachmentInsertAll', 'XenForo.AttachmentInsertAll');

	XenForo.register('.AttachmentDeleteAll', 'XenForo.AttachmentDeleteAll');
}
(jQuery, this, document);