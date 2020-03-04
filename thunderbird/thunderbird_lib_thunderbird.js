function is_thunderbird_installed()
{
	regKey = 'HKEY_LOCAL_MACHINE\\Software\\Mozilla\\Mozilla Thunderbird';

	if ( ! SysRegKeyExists( regKey ) )
		return false;

	return true;
}


function is_thunderbird_plugin_registered() 
{
	extDir = base1_config.app_setup_dir + '\\thunderbird\\' + get_plugin_uid();
    if (is_thunderbird_installed()) {
    	proxyPath = get_thunderbird_proxy();

    	if (FilePathExists(proxyPath) && PathIsDirectory(extDir) )
        {
        	return true;
        }
        else
        {
        	return false;
        }
    }
    else
        return false;
}

function set_thunderbird_proxy( extPath )
{
    regKey = 'HKEY_LOCAL_MACHINE\\Software\\Mozilla\\Mozilla Thunderbird';
    ver = GetSysRegStrValue(regKey, 'CurrentVersion');

    if (ver == '')
        throw UserError('Mozilla Thunderbird is not installed.');

    proxyPath = get_thunderbird_proxy();
    if (proxyPath != '')
    	PutFileData(proxyPath, extPath);
    else
    	throw UserError('Check your profile settings or \nStart Mozilla Thunderbird for first configuration');
}

function get_thunderbird_proxy() 
{
	appData = GetShellFolderPath( "AppData" );
    profPath = appData + '\\Thunderbird';

    pathIni = profPath + '\\profiles.ini';
    if (FilePathExists(pathIni))
    	defProfile = LoadFileData(pathIni);
    else
    	return '';

    if ((obj = StrOptScan(defProfile, '%*s[Profile0]%*sPath=Profiles/%s.default%*s')) != undefined)
    {
    	defProfile = obj[0];
    }
    else
    	return '';

    profPath = profPath + '\\Profiles\\' + defProfile + '.default' + '\\extensions';
	ObtainDirectory(profPath);
	profPath += '\\' + get_plugin_uid();
    return profPath;
}

function get_thunderbird_dir()
{
	regKey = 'HKEY_LOCAL_MACHINE\\Software\\Mozilla\\Mozilla Thunderbird';
	versionStr = GetSysRegStrValue( regKey, 'CurrentVersion' );

	if ( versionStr == '' )
		throw UserError( 'Mozilla Thunderbird is not installed.' );

	dir = GetSysRegStrValue(regKey + '\\' + versionStr + '\\Main', 'Install Directory');
	return dir;
}


function register_thunderbird_plugin()
{
    build_plugin_files();
    extPath = FilePath(FilePath(base1_config.app_setup_dir, 'thunderbird'), get_plugin_uid());
    set_thunderbird_proxy(extPath);
}


function build_plugin_files()
{
	try
	{
		extDir = base1_config.app_setup_dir + '\\thunderbird\\' + get_plugin_uid();
		ObtainDirectory(FilePathToUrl(extDir));

		sampleDir = base1_config.app_setup_dir + '\\thunderbird\\samples';
		if (PathIsDirectory(extDir))
		{
			root = lib_gate.get_email_plugin_config();

			str = LoadUrlData(FilePathToUrl(sampleDir + '\\thunderbird_toolbar_template.xul'));
			str = StrReplace(str, '##STR_NO_ITEMS_SELECTED##', UiText.errors.no_message_selected);

			overlayDoc = OpenDocFromStr(str);

			toolbar = overlayDoc.TopElem.toolbox.toolbar;
			toolbar.Clear();

			actions = root.actions;
			root.Doc.WriteAllNodes = true;
			root.Doc.SaveToUrl(FilePathToUrl(extDir + '\\email_plugin_config.xml'));

			for (subElem in actions)
			{
				pic16_url = StrLeftRange(subElem.image_url, StrLen(subElem.image_url) - 4) + '_16.ico';
				image_url = FilePathExists(UrlToFilePath(pic16_url)) ? pic16_url : subElem.image_url;

				button = toolbar.AddChild('toolbarbutton');
				button.AddAttr('id', subElem.id);
				button.AddAttr('label', subElem.name);
				//button.AddAttr( 'tooltiptext', subElem.name.OptAttrValue('VALUE') );
				button.AddAttr('style', 'list-style-image: url(\'' + lib_gate.plugin_url_to_file_url( image_url ) + '\');');
				button.AddAttr('oncommand', 'objEStaffToolbar.runAction(id);');
			}

			overlayDoc.SaveToUrl(FilePathToUrl(FilePath(extDir, 'toolbar.xul')), 'tabs=1');
			//install.rdf
			str = LoadUrlData(FilePathToUrl(sampleDir + '\\install.rdf'));
			installDoc = OpenDocFromStr(str);
			appVer = AppVersion;
			desc = root.description;

			installDoc.RDF.Description.Child('em:version').Value = appVer;
			installDoc.RDF.Description.Child('em:description').Value = desc;
			installDoc.SaveToUrl(FilePathToUrl(extDir + '\\install.rdf'));

			//rest of the files
			PutFileData(extDir + '\\chrome.manifest', LoadUrlData(FilePathToUrl(sampleDir + '\\chrome.manifest')));
			PutFileData(extDir + '\\mailLoad.js', LoadUrlData(FilePathToUrl(sampleDir + '\\mailLoad.js')));
			PutFileData(extDir + '\\io.js', LoadUrlData(FilePathToUrl(sampleDir + '\\io.js')));
			PutFileData(extDir + '\\xmlWriter.js', LoadUrlData(FilePathToUrl(sampleDir + '\\xmlWriter.js')));
		}
	}
	catch (e)
	{
		alert(e);
	}
}


function get_plugin_uid()
{
	return '{46D1B3C0-DB7A-4b1a-863A-6EE6F77ECB58}';
}

function unregister_thunderbird_plugin() 
{
    proxyPath = get_thunderbird_proxy();
    if (FilePathExists(proxyPath))
    	DeleteFile(proxyPath);

}