function Init()
{
	base1_config.serverApiQueryCache = new Dictionary();

	for ( propVal in AppConfig.GetProperties( 'web-handler' ) )
	{
		strArray = propVal.split( ' ' );
		if ( strArray.length != 2 )
			throw UserError( 'Invalid "web-handler" parameter' );

		webHandler = base1_config.web_handlers.AddChild();
		webHandler.base_url_path = strArray[0];
		webHandler.handler_url = AbsoluteUrl( strArray[1], 'x-app:///' );
	}
}


function OnWebRequest( Request )
{
	if ( StrBegins( Request.UrlPath, '/app_url/' ) )
	{
		OnWebRequestAppUrl( Request );
		return true;
	}

	webHandlers = ArraySelect( base1_config.web_handlers, 'lib_base.IsSubUrlPathOrSelf( Request.UrlPath, base_url_path )' );
	webHandler = ArrayOptMax( webHandlers, 'StrLen( base_url_path )' );
	if ( webHandler == undefined )
		return false;

	Request.HandlerUrl = webHandler.handler_url;
	return true;
}


function OnWebRequestAppUrl( Request )
{
	if ( ! StrBegins( Request.UrlPath, '/app_url/rcr/help' ) )
		throw UserError( 'Invalid app url' );

	url = StrReplaceOne( Request.UrlPath, '/app_url', 'x-app:/' );
	Request.HandleStaticFile( UrlToFilePath( url ) );
}


function RunQueryWithCache( queryStr, pageIndex, pageSize, options )
{
	keyObj = new Object;
	keyObj.queryStr = queryStr;
	keyObj.userID = LdsCurUserID;

	key = EncodeJson( keyObj );

	cacheEntry = base1_config.serverApiQueryCache.ObtainByKey( key, 'CreateQueryCacheEntry()' );
	isNew = ( cacheEntry.array == undefined );
	if ( isNew )
	{
		cacheEntry.startTime = CurDate;
		cacheEntry.storeTimeout = options.storeTimeout;
		cacheEntry.array = XQuery( queryStr );
		cacheEntry.totalCount = ArrayCount( cacheEntry.array );
	}
	
	queryResult = new Object;
	queryResult.array = ArrayRange( cacheEntry.array, pageIndex * pageSize, pageSize );
	queryResult.totalCount = cacheEntry.totalCount;
	queryResult.hasMore = ( ( pageIndex + 1 ) * pageSize < cacheEntry.totalCount && ArrayCount( cacheEntry.array ) >= pageSize );

	cacheEntry.lastUseTime = CurDate;

	if ( isNew )
	{
		if ( queryResult.hasMore )
		{
			thread = new Thread;
			thread.Param.key = key;
			thread.Param.cacheEntry = cacheEntry;
			thread.EvalCode( 'lib_server_api.CheckQueryThreadProc( ActiveThread )' );
		}
		else
		{
			base1_config.serverApiQueryCache.DeleteByKey( key );
		}
	}
	
	return queryResult;
}


function CreateQueryCacheEntry()
{
	cacheEntry = new SafeObject;
	cacheEntry.array = undefined;
	return cacheEntry;
}


function CheckQueryThreadProc( thread )
{
	cacheEntry = thread.Param.cacheEntry;
	Sleep( cacheEntry.storeTimeout * 1000 );

	while ( true )
	{
		if ( CurDate >= DateOffset( cacheEntry.lastUseTime, cacheEntry.storeTimeout ) )
			break;

		Sleep( 1000 );
	}

	base1_config.serverApiQueryCache.DeleteByKey( thread.Param.key );
}



