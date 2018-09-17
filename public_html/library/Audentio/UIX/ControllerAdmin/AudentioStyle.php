<?php
class Audentio_UIX_ControllerAdmin_AudentioStyle extends XenForo_ControllerAdmin_Abstract
{
	public function actionIndex()
	{
		$styleModel = $this->_getStyleModel();

		$audentioModel = $this->getModelFromCache('Audentio_UIX_Model_Audentio');

		$styles = $audentioModel->getStylesFromApi();

		if ($styles == 'ERR_NO_CURL')
		{
			return $this->responseError(new XenForo_Phrase('uix_no_curl'));
		}

		if ($styles == 'ERR_INVALID_API_KEY')
		{
			return $this->responseError(new XenForo_Phrase('uix_invalid_api_key'));
		}

		foreach ($styles as &$style)
		{
			$style['installed'] = $styleModel->getAudentioStyleByPid($style['pid']);
		}

		$viewParams = array(
			'styles' => $styles,
			'totalStyles' => count($styles) + ($styleModel->showMasterStyle() ? 1 : 0)
		);

		return $this->responseView('Audentio_UIX_ViewAdmin_AudentioStyle_List', 'uix_style_list', $viewParams);
	}

	public function actionOutdated()
	{
		$styleModel = $this->_getStyleModel();

		$audentioModel = $this->getModelFromCache('Audentio_UIX_Model_Audentio');

		$styles = $audentioModel->getStylesFromApi();

		if ($styles == 'ERR_INVALID_API_KEY')
		{
			return $this->responseError(new XenForo_Phrase('uix_invalid_api_key'));
		}

		foreach ($styles as &$style)
		{
			$style['installed'] = $styleModel->getAudentioStyleByPid($style['pid']);
		}

		$viewParams = array(
			'styles' => $styles,
			'totalStyles' => count($styles) + ($styleModel->showMasterStyle() ? 1 : 0)
		);

		return $this->responseView('Audentio_UIX_ViewAdmin_AudentioStyle_Outdated_List', 'uix_style_outdated_list', $viewParams);
	}

	public function actionInstall()
	{
		$pid = $this->_input->filterSingle('pid', XenForo_Input::UINT);

		$audentioModel = $this->getModelFromCache('Audentio_UIX_Model_Audentio');

		$product = $audentioModel->getStyleFromApi($pid);
		$style = $this->_getStyleModel()->getAudentioStyleByPid($pid);

		if ($this->isConfirmedPost())
		{
			$style = $this->_getStyleModel()->getAudentioStyleByPid($pid);

			if ($style)
			{
				$overwrite = $style['style_id'];
			}
			else
			{
				$overwrite = 0;
			}

			$return = $audentioModel->downloadStyleFromApi($pid);

			if (is_string($return))
			{
				switch($return)
				{
					case 'ERR_PRODUCT_NOT_PURCHASED':
						$msgPhrase = 'uix_product_not_purchased';
						break;
					case 'ERR_NO_LICENSE':
						$msgPhrase = 'uix_no_license';
						break;
					case 'ERR_LICENSE_EXPIRED':
						$msgPhrase = 'uix_license_expired';
						break;
					case 'ERR_NO_DOWNLOAD_FOR_YOUR_VERSION':
						$msgPhrase = 'uix_no_download_for_your_version';
						break;
					default:
						$msgPhrase = $return;
						break;
				}

				return $this->responseError(new XenForo_Phrase($msgPhrase));
			}
			else
			{
				session_start();

				$product = $audentioModel->getStyleFromApi($pid);
				$filePath = $audentioModel->filePath;
				$dirName = 'adstyle-'.time();
				$dirPath = getcwd().DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.$dirName.DIRECTORY_SEPARATOR;

				$zip = new ZipArchive();
				if (!$zip->open($filePath))
				{
					return $this->responseError(new XenForo_Phrase('uix_invalid_download'));
				}
				mkdir($dirPath);
				$zip->extractTo($dirPath);
				$zip->close();
				unlink($filePath);

				$audentioModel->rmove($dirPath.DIRECTORY_SEPARATOR.'Upload'.DIRECTORY_SEPARATOR, getcwd());

				$_SESSION['product'] = $product;
				$_SESSION['dirPath'] = $dirPath;
				$_SESSION['pid'] = $pid;
				$_SESSION['overwrite'] = $overwrite;
				return $this->responseRedirect(XenForo_ControllerResponse_Redirect::SUCCESS, XenForo_Link::buildAdminLink('audentio-styles/install-step2'), '');
			}
		}
		else
		{
			$requireFtp = false;
			if (!is_writable(getcwd().DIRECTORY_SEPARATOR.'styles'.DIRECTORY_SEPARATOR) || !is_writable(getcwd().DIRECTORY_SEPARATOR.'js'.DIRECTORY_SEPARATOR))
			{
				$requireFtp = true;
			}

			$viewParams = array(
				'requireFtp'	=> $requireFtp,
				'product'		=> $product,
				'style'			=> $style,
			);

			return $this->responseView('Audentio_UIX_AudentioStyle_Install_Confirm', 'uix_style_install_confirm', $viewParams);
		}
	}

	public function actionInstallStep2()
	{
		session_start();
		$dirPath = $_SESSION['dirPath'];
		$product = $_SESSION['product'];

		$xmlFile = $dirPath.'style-'.str_replace(' ', '-', $product['name']).'.xml';

		foreach(glob($dirPath.'*.xml') as $file)
		{
			$backupXmlFile = $file;
			break;
		}

		if (!file_exists($xmlFile))
		{
			$xmlFile = $backupXmlFile;
		}

		$input['overwrite_style_id'] = (int) $_SESSION['overwrite'];
		$input['pid'] = $product['pid'];
		$input['version'] = $product['product_version'];

		$document = $this->getHelper('Xml')->getXmlFromFile($xmlFile);
		$style = $this->_getStyleModel()->importAudentioStyleXml($document, $input);

		$xenOptions = XenForo_Application::get('options')->getOptions();

		$writerData = array(
			'title'				=> $xenOptions['boardTitle'] . ' - ' . $style['title'],
			'description'		=> '',
			'user_selectable'	=> 1,
			'parent_id'			=> $style['style_id'],
		);

		$_SESSION['POSTDATA'] = $writerData;

		if ($_SESSION['overwrite'])
		{
			$link = XenForo_Link::buildAdminLink('audentio-styles/install-cleanup');
		}
		else
		{
			$link = XenForo_Link::buildAdminLink('audentio-styles/install-step3');
		}

		return $this->responseRedirect(
			XenForo_ControllerResponse_Redirect::SUCCESS,
			$link
		);
	}

	public function actionInstallStep3()
	{
		session_start();
		if (!$_SESSION['overwrite'])
		{
			$dataId = $this->_input->filterSingle('data_id', XenForo_Input::STRING);

			$writerData = $_SESSION['POSTDATA'];

			$writer = XenForo_DataWriter::create('XenForo_DataWriter_Style');
			$writer->bulkSet($writerData);
			$writer->save();

			unset($_SESSION['POSTDATA']);
		}

		return $this->responseRedirect(
			XenForo_ControllerResponse_Redirect::SUCCESS,
			XenForo_Link::buildAdminLink('audentio-styles/install-cleanup')
		);
	}

	public function actionInstallCleanup()
	{
		session_start();
		$dirPath = $_SESSION['dirPath'];
		unset($_SESSION['dirPath']);
		unset($_SESSION['product']);
		unset($_SESSION['overwrite']);
		$this->getModelFromCache('Audentio_UIX_Model_Audentio')->rrmdir($dirPath);
		return $this->responseRedirect(XenForo_ControllerResponse_Redirect::SUCCESS, XenForo_Link::buildAdminLink('styles'));
	}

	protected function _checkCsrf($action)
	{
		if (strtolower($action) == 'child')
		{
			// may be coming from external payment gateway
			return;
		}

		parent::_checkCsrf($action);
	}

	protected function _getStyleModel()
	{
		return $this->getModelFromCache('XenForo_Model_Style');
	}
}