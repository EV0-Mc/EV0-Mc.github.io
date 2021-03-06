<?php

class XenForo_Helper_Http
{
	/**
	 * Gets a Zend_Http_Client object, automatically switching to cURL if the
	 * specified URL can't be handled by streams.
	 *
	 * @param string $uri
	 * @param array $options
	 *
	 * @return Zend_Http_Client
	 */
	public static function getClient($uri, array $options = array())
	{
		if (!isset($options['adapter']))
		{
			$options += self::getExtraHttpClientOptions($uri);
		}

		if (empty($options['useragent']))
		{
			if (preg_match('/^\d+\.\d+/', XenForo_Application::$version, $versionMatch))
			{
				$version = $versionMatch[0];
			}
			else
			{
				$version = '1.x';
			}
			$options['useragent'] = "XenForo/$version (" . XenForo_Application::getOptions()->boardUrl . ')';
		}

		return new Zend_Http_Client($uri, $options);
	}

	/**
	 * Gets a Zend_Http_Client object designed for use on untrusted URLs. This allows an admin
	 * to configure use of an HTTP proxy (such as with Zend_Http_Client_Adapter_Proxy)
	 *
	 * @param string $uri
	 * @param array $options
	 *
	 * @return Zend_Http_Client
	 */
	public static function getUntrustedClient($uri, array $options = array())
	{
		$uri = self::filterUntrustedUrl($uri);

		if (!self::isRequestableUntrustedUrl($uri, $requestError))
		{
			// use this exception type as it is caught in some cases
			throw new Zend_Uri_Exception("URI '$uri' is not requestable ($requestError)");
		}

		$options['maxredirects'] = 0;

		if (empty($options['useragent']))
		{
			if (preg_match('/^\d+\.\d+/', XenForo_Application::$version, $versionMatch))
			{
				$version = $versionMatch[0];
			}
			else
			{
				$version = '1.x';
			}
			$options['useragent'] = "XenForo/$version (" . XenForo_Application::getOptions()->boardUrl . ')';
		}

		$untrustedConfig = XenForo_Application::getConfig()->untrustedHttpClient;
		$config = $untrustedConfig ? $untrustedConfig->toArray() : array();
		if (!empty($config['adapter']))
		{
			$config += $options;
			return new Zend_Http_Client($uri, $config);
		}
		else
		{
			return self::getClient($uri, $options);
		}
	}

	public static function filterUntrustedUrl($url)
	{
		$url = preg_replace('/#.*$/', '', $url);

		return $url;
	}

	public static function isRequestableUntrustedUrl($url, &$error = null)
	{
		$parts = @parse_url($url);

		if (!$parts || empty($parts['scheme']) || empty($parts['host']))
		{
			$error = 'invalid';
			return false;
		}

		if (!in_array(strtolower($parts['scheme']), array('http', 'https')))
		{
			$error = 'scheme';
			return false;
		}

		if (!empty($parts['port']) && !in_array($parts['port'], array(80, 443)))
		{
			$error = 'port';
			return false;
		}

		if (!empty($parts['user']) || !empty($parts['pass']))
		{
			$error = 'userpass';
			return false;
		}

		if (strpos($parts['host'], '[') !== false)
		{
			$error = 'ipv6';
			return false;
		}

		$hasValidIp = false;

		$ips = @gethostbynamel($parts['host']);
		if ($ips)
		{
			foreach ($ips AS $ip)
			{
				if (self::isLocalIpv4($ip))
				{
					$error = "local: $ip";
					return false;
				}
				else
				{
					$hasValidIp = true;
				}
			}
		}

		if (function_exists('dns_get_record') && defined('DNS_AAAA'))
		{
			$hasIpv6 = defined('AF_INET6');
			if (!$hasIpv6 && function_exists('curl_version') && defined('CURL_VERSION_IPV6'))
			{
				$version = curl_version();
				if ($version['features'] & CURL_VERSION_IPV6)
				{
					$hasIpv6 = true;
				}
			}

			if ($hasIpv6)
			{
				$ipv6s = @dns_get_record($parts['host'], DNS_AAAA);
				if ($ipv6s)
				{
					foreach ($ipv6s AS $ipv6)
					{
						$ip = $ipv6['ipv6'];
						if (self::isLocalIpv6($ip))
						{
							$error = "local: $ip";
							return false;
						}
						else
						{
							$hasValidIp = true;
						}
					}
				}
			}
		}

		if (!$hasValidIp)
		{
			$error = 'dns';
			return false;
		}

		return true;
	}

	public static function isLocalIpv4($ip)
	{
		return preg_match('#^(
			0\.|
			10\.|
			100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.|
			127\.|
			169\.254\.|
			172\.(1[6-9]|2[0-9]|3[01])\.|
			192\.0\.0\.|
			192\.0\.2\.|
			192\.88\.99\.|
			192\.168\.|
			198\.1[89]\.|
			198\.51\.100\.|
			203\.0\.113\.|
			224\.|
			240\.|
			255\.255\.255\.255
		)#x', $ip);
	}

	public static function isLocalIpv6($ip)
	{
		$ip = XenForo_Helper_Ip::convertIpStringToBinary($ip);

		$ranges = array(
			'::' => 128,
			'::1' => 128,
			'::ffff:0:0' => 96,
			'100::' => 64,
			'64:ff9b::' => 96,
			'2001::' => 32,
			'2001:db8::' => 32,
			'2002::' => 16,
			'fc00::' => 7,
			'fe80::' => 10,
			'ff00::' => 8
		);
		foreach ($ranges AS $rangeIp => $cidr)
		{
			$rangeIp = XenForo_Helper_Ip::convertIpStringToBinary($rangeIp);
			if (XenForo_Helper_Ip::ipMatchesCidrRange($ip, $rangeIp, $cidr))
			{
				return true;
			}
		}

		return false;
	}

	public static function getUntrustedWithRedirects($requestUrl, array $config, array $headers = array(), $streamFile = null)
	{
		$requestsMade = 0;
		$hasRedirect = false;

		$config['maxredirects'] = 0;

		do
		{
			if ($hasRedirect && $streamFile)
			{
				// make sure any previous redirect content is wiped out before trying again
				@unlink($streamFile);
			}

			if (preg_match_all('/[^A-Za-z0-9._~:\/?#\[\]@!$&\'()*+,;=%-]/', $requestUrl, $matches))
			{
				foreach ($matches[0] AS $match)
				{
					$requestUrl = str_replace($match[0], '%' . strtoupper(dechex(ord($match[0]))), $requestUrl);
				}
			}
			$requestUrl = preg_replace('/%(?![a-fA-F0-9]{2})/', '%25', $requestUrl);

			$client = XenForo_Helper_Http::getUntrustedClient($requestUrl, $config)
				->setHeaders($headers);

			$response = $client->request('GET');

			$requestsMade++;
			$hasRedirect = false;

			if ($response->isRedirect() && ($location = $response->getHeader('location')))
			{
				if (is_array($location))
				{
					$location = reset($location);
				}

				$requestUrl = XenForo_Helper_Http::getRedirectedUrl($requestUrl, $location);
				$hasRedirect = true;
			}
		}
		while ($requestsMade < 5 && $hasRedirect);

		return $response;
	}

	public static function getRedirectedUrl($originalUrl, $newUrl)
	{
		if (!strlen($newUrl))
		{
			throw new InvalidArgumentException("Empty new URL provided");
		}

		if (Zend_Uri_Http::check($newUrl))
		{
			return $newUrl;
		}

		/** @var Zend_Uri_Http $uri */
		$uri = Zend_Uri::factory($originalUrl);

		if (strpos($newUrl, '?') !== false)
		{
			list($newUrl, $qs) = explode('?', $newUrl, 2);
		}
		else
		{
			$qs = '';
		}
		$uri->setQuery($qs);

		if ($newUrl[0] === '/')
		{
			// absolute path
			$uri->setPath($newUrl);
		}
		else
		{
			// relative path
			$path = $uri->getPath();
			$lastSlash = strrpos($path, '/');
			if ($lastSlash)
			{
				$path = substr($path, 0, $lastSlash);
			}
			$uri->setPath($path . '/' . $newUrl);
		}

		return $uri->getUri();
	}

	/**
	 * Gets extra options to pass to an HTTP client to ensure it works in more situations
	 *
	 * @param string $uri
	 *
	 * @return array
	 */
	public static function getExtraHttpClientOptions($uri)
	{
		$parts = parse_url($uri);
		$wrappers = stream_get_wrappers();
		if (!in_array($parts['scheme'], $wrappers))
		{
			// can't be handled by sockets -- fallback to cURL
			if (function_exists('curl_getinfo'))
			{
				return array(
					'adapter' => 'Zend_Http_Client_Adapter_Curl',
					'curloptions' => array(CURLOPT_SSL_VERIFYPEER => false)
				);
				// TODO: consider validating SSL cert
			}
		}

		return array();
	}
}