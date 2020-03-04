function ChangeCreationDate()
{
	newDate = au_tools.select_date( CurDate );

	try
	{
		list = FindScreen( 'FrameMain' ).FindItemByType( 'LIST' );
	}
	catch ( e )
	{
		list = undefined;
	}

	hasSel = false;

	if ( list != undefined )
	{
		for ( row in list.SelRows )
		{
			hasSel = true;

			try
			{
				docID = row.Env.ListElem.candidate_id;
			}
			catch ( e )
			{
				docID = row.Env.ListElem.id;
			}

			try
			{
				doc = OpenDoc( UrlFromDocID( docID ) );
			}
			catch ( e )
			{
				return;
			}

			doc.TopElem.doc_info.creation.date = newDate;
			doc.Save();
		}
	}

	if ( ! hasSel )
		throw UserError( UiText.errors.objects_not_selected );
}


function handle_resave_objects()
{
	try
	{
		screen = FindScreen( 'FrameMain' );
		list = screen.FindItemByType( 'LIST' );
	}
	catch ( e )
	{
		try
		{
			screen = FindScreen( 'FrameSubView' );
			list = screen.FindItemByType( 'LIST' );
		}
		catch ( e )
		{
			list = undefined;
		}
	}

	hasSel = false;

	if ( list != undefined )
	{
		for ( row in list.SelRows )
		{
			hasSel = true;

			try
			{
				docID = row.Env.ListElem.candidate_id;
			}
			catch ( e )
			{
				docID = row.Env.ListElem.id;
			}

			try
			{
				doc = DefaultDb.OpenObjectDoc( row.Env.ListElem.Name, docID );
			}
			catch ( e )
			{
				return;
			}

			if ( StrContains( doc.FormUrl, 'rc_candidate.xmd' ) )
			{
				au_tools.update_idata_by_voc( doc.TopElem.profession_id );
			}

			doc.WriteDocInfo = false;

			doc.Save();
		}
	}

	if ( ! hasSel )
		throw UserError( UiText.errors.objects_not_selected );

	screen.Update();
}


