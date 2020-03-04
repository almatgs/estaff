var objEStaffToolbar = 
{
runAction: function (actionID) 
{
    try {
        messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
		var aProcess = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
		var fileXml = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).
			get("TmpD", Components.interfaces.nsIFile);
		var fileExec = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
		var fileProxy = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
        
        var selMessages = gFolderDisplay.selectedCount
        if(selMessages == 0)
        {
            alert(gStrNoItemsSelected);
            return false;
        }
        
        //load contents of the proxy file
        var curProfD = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).
        get("ProfD", Components.interfaces.nsIFile);
        curProfD.append("extensions");
        curProfD.append("{46D1B3C0-DB7A-4b1a-863A-6EE6F77ECB58}");

		var proxyPath = curProfD.path;
		fileProxy.initWithPath(proxyPath);
		try
        {
		    if(fileProxy.exists())
            {
                var _fileIn = FileIO.open(fileProxy.path);
                var proxyContents = FileIO.read(_fileIn);
		    }   
		    else
		    return false;
	    }
	    catch(e)
	    {
            alert(e);
	    }
		let Up = proxyContents.indexOf('thunderbird');
		var srcExe = proxyContents.substring(0, Up);

        configFile = this.getPathConfig(srcExe);
        aExpr = '/email_plugin_config/actions/action[id=\'' + actionID + '\']/allow_multi_select';
        multi_select = this.evaluateXPath(configFile, aExpr);

	    //write action xml
		var XML=new XMLWriter();
		XML.Init();
        XML.BeginNode("email_plugin_action");
		XML.Node("action_id", actionID);
		XML.BeginNode("items");

		selMessages = gFolderDisplay.selectedCount;

		if( multi_select == '' )
			multi_select = '0';
        if((selMessages > 1 && multi_select == '1') || (selMessages == 1 && multi_select == '0') || (selMessages == 1 && multi_select == '1'))
        {
            for (var i = 0; i < selMessages; i++) 
            {
		        let uri = gFolderDisplay.selectedMessageUris[i];
		        let messageService = messenger.messageServiceFromURI(uri);

		        let messageStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance().QueryInterface(Components.interfaces.nsIInputStream);
		        let inputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
		        inputStream.init(messageStream);
		        messageService.streamMessage(uri, messageStream, {}, null, false, null);
		        var body = "";
		        inputStream.available();
		        while (inputStream.available()) 
                {
		            body = body + inputStream.read(512);
                }
		        messageStream.close();
		        inputStream.close();
		        XML.BeginNode("item");
		        XML.Node("item_type_id", "email_message");
		        XML.Node("mime_body", body);
		        XML.EndNode();
		    }
        }
		else if(selMessages > 1 && multi_select == '0')
        {
            return false;
        }

		XML.EndNode();
        XML.EndNode();
        XML.Close();
		fileXml.append("runAction.xml");
		//var charset = "windows-1251";
		var charset = "utf-8";
		if (!fileXml.exists()) 
        {
			fileXml.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
        }
		var res = FileIO.write(fileXml, XML.ToString(), charset);
		
		//form exec path
        expr = '//handler_method';
        handlerMethod = this.evaluateXPath(configFile, expr);

		srcExe = srcExe + "\SpXml.exe";
		
		//load estaff process		
		fileExec.initWithPath(srcExe);
		aProcess.init(fileExec);
		var regexp = /\\/g;
		var path = fileXml.path;
		path = path.replace(regexp, "/");
		var filePath = 'file:///' + path;
		execCommand = "/E";
		execPath = handlerMethod + '(\'' + filePath + '\')';
		var args = [execCommand, execPath];
		aProcess.run(false, args, args.length);
        //res = FileIO.unlink(fileXml);
    }
    catch(e)
    {
        alert(e); 
        return false;
    }
    return true;
},

getPathConfig: function(srcPath)
{
	return srcPath + "\\thunderbird\\" + this.get_plugin_uid() + "\\email_plugin_config.xml";
},

get_plugin_uid: function()
{
	return '{46D1B3C0-DB7A-4b1a-863A-6EE6F77ECB58}';
},

evaluateXPath: function(pathConfig, aExpr)
{
    var fileConfig = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
    fileConfig.initWithPath(pathConfig);
    try
    {
        if(fileConfig.exists())
        {
            var fileIn = FileIO.open(fileConfig.path);
            var fileContents = FileIO.read(fileIn);
            //var domParser = Components.classes["@mozilla.org/xmlextras/domparser;1"].createInstance(Components.interfaces.nsIDOMParser);
            var domParser = new DOMParser();
            var dom = domParser.parseFromString(fileContents, "text/xml");
            var evalItem = dom.evaluate( aExpr, dom, null, XPathResult.STRING_TYPE, null );
            return evalItem.stringValue;
        }   
        else
            return null;
    }
    catch(e)
    {
        alert(e);
    }
}
};