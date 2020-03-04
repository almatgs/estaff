// ����� ��� �������� ��������� �� MS Excel
// ������ ��� ���������� � ����� ������ ���� �����������, ��������, � ���������� �������:
// ----------������� 1 ---------- �������2 ----------- �������3---------------
// ������1 	�������1.��������1	�������2.��������21	�������3.��������31
// ������2   										�������3.��������32
// ������3	�������1.��������2  �������2.��������22
// ������4						�������2.��������23
// ----------------------------------------------------------------------------
// ���������� �� ����� ����������� � ���������� ������������� (professions).

// ���� � ����������� ��������� (� �������: <is_std>1</is_std>) ���� ���������������� �������� ��������, ��
// ���������������� �������� �����������, � ����������� ��� ����������� ����������� ��������.

// ���� �������� ��� ������������� � ���� �������������� �������� ��������� � ��������� ������������, ��:
// ��������� �� ������� ����� �������, ����������� ������ ��� �������� �������� (���� �� ������� �� ��������� � ��� ����������). 
 
// ����� ������� �� ����������� �������������� ��� ����������� �������� (� �������: <is_std>1</is_std>) , �
// ������� ��� �������� ���������������� ���������.

// ��������� (�����) ����������� ������������:
// ����� ���� � ������������� ���������� ����� ��������� (����� �����).



function UniPorfessionsHierImport()
{
	lib_base.check_desktop_client();

	cL = new Array(); //������ �� EXCEL-�����
	aL = new Array(); //������� �������� �� ����������� ��������� 
	rowLength = 0; // ������ ������ �� EXCEL-�����
	smallArray = new Array(); //�������� ������ ��������� ��� �������� ��������� � ����
	elemID = 1; //id ��� ������ ��������
	isInBase = false; //����� ��������� � ������ ���� �� ����������
	isParentOpen = false; //������������ ������� ��� ����� ������������ �������� ��� �� ������
	coincidence = 0; //���������� ���������� ����� ������� ������� �� EXCEL-����� � �������� ��������� �� ����
	rowCurrentNumber = 0; //���������� �������� ����� � ������ �� EXCEL-�����
	deletedArray = new Array(); // ������ ��������� ����������� ���������
	
	//�������� �����=========================== 
	LogEvent('', 'Start downloading professions from file.'); //������ �������� ��������� �� �����.
	fileUrl = ActiveScreen.AskFileOpen();
	if ( fileUrl == '' ) //��������� ������� url  ����� ��� ��������
		throw UserError( UiText.errors.unable_to_open_file );
	LogEvent('', 'Check for file import - passed. fileUrl = ' + fileUrl); //�������� �� ������� ����� ��� ������� - ��������.
	
	srcDoc = OpenDoc( fileUrl, 'format=excel' );
	LogEvent('', 'Open a file to import.'); // ���� ��� ������� ������
	//�������� ��������� ��������� =========================================
	array = ArraySort( professions, 'name', '+'); //������ ���������
	//LogEvent('', '������ ��������� �������� �� ���� ������ E-Staff - ��������������.');
	//==========================================
	
	arrayFlags = new Array();
	for (a=0; a<array.length; a++) //������� ������ ���������
	{
		arrayFlags[a] = 0;
		if (array[a].is_std == false)
		{
			arrayFlags[a] = 1; //������ ��������� - ����������������, �� �������!
		}
	}
	
	var c1=0; var c2=1;
	while(c1 != c2)
	{
		c1 = 0; for (a=0; a<arrayFlags.length; a++) { if (arrayFlags[a] == 1) {c1++;} } //������� ���������� "����������" ���������
		for (a=0; a<array.length; a++) //������� ������ ���������
		{
			if ((arrayFlags[a] == 1)&& 	//������ ��������� - ����������������, �� �������!
				(array[a].parent_id.HasValue)) 		 //���� ���� ����������� ��������� - �� ���� �� �������!
			{
				for (b=0; b<array.length; b++) //������� ������ ���������
				{
					if (array[b].id == array[a].parent_id)
					{
						arrayFlags[b] = 1; //������ ��������� - ����������� ��� ����������������, �� �������!
					}
				}	
			}
		}
		c2 = 0; for (a=0; a<arrayFlags.length; a++) { if (arrayFlags[a] == 1) {c2++;} } //������� ���������� "����������" ���������
	}
	
	for  (a=0; a<arrayFlags.length; a++) //�������� "������� �����" ���������
	{
		if (arrayFlags[a] == 0)
		{
			professionForDeleteUrl = ObjectDocUrl('data','profession', array[a].id );
			DeleteDoc(professionForDeleteUrl);
		}
	}
	
	//�������� ��������� ��������� =========================================
	array = ArraySort( professions, 'name', '+'); //������ ���������
	//LogEvent('', '������ ��������� �������� �� ���� ������ E-Staff - ��������');
	//==========================================
	
	//���������� ��� ������ � �������� EXCEL-�����, ��������� ������������ ������ ������
	for ( row in srcDoc.TopElem[0] )  { if (rowLength < ArrayCount(row)) { rowLength = ArrayCount(row); } }
	LogEvent('', 'Find the line EXCEL maximum length of ' + rowLength); //������� ������ EXCEL ������������ ������, ������
	
	for ( i = 0; i<=(rowLength-1); i++)  { cL[i]=''; aL[i]=0; }//�������� �������� ��������
	for ( row in srcDoc.TopElem[0] ) //�������� ��������� ������� ������ ���������: ���������� ��� ������ � �������� EXCEL-�����================
	{
		rowCurrentNumber = 0;
		for ( i = 0; i<=(rowLength-1); i++) //��������� �������� ������ �� ��������� ������ EXCEL-�����
		{
			if ((row[i] != '')&&(cL[i]==''))  { cL[i]=row[i]; }
			if ((row[i] != '')&&(cL[i] !='')) { cL[i]=row[i]; }
			if  (row[i] != '') {rowCurrentNumber++;}
		}
		
		if ((rowCurrentNumber>0)&&(cL[0] != '')&&(row[0] != '' )) //���� ������� ������ EXCEL-����� �� ������
		{	
			isInBase = false;
			for ( profession in array ) //������� ������ ���������, ����������� �� ���� ������ E-Staff
			{
				if (( profession.parent_id.HasValue == false)&&(profession.name == cL[0])) { isInBase = true; }
			} 
		
			if (isInBase == false) //���� ��������� �� ������ EXCEL-����� � ���� �� ������� - ������� ��������� ������� ������ ��������
			{
				elemID = lib_voc.obtain_next_voc_elem_id( professions );
				subDoc = DefaultDb.OpenNewObjectDoc( 'profession', elemID );
			//	elemID = elemID + 1;
				subDoc.TopElem.order_index = lib_voc.obtain_next_voc_elem_order_index( professions );
				subDoc.TopElem.name =  row[0];
				smallArray.push(subDoc.TopElem); //�������� ��������� � ��������� ������
				subDoc.Save();
			}
		}	
	}// ��� ������ � �������� EXCEL-����� ���������
	
	for (newProfession in smallArray) { LogEvent('', 'New profession Level 1: ' + newProfession.name); } //����� ������������� 1 ������:
	if (smallArray.length > 0)
	{
		array = ArrayUnion(array, smallArray); //���������� �������
		salo = smallArray.length;
		smallArray.splice( 0, salo ); //������� ��������� ������
		LogEvent('', 'Completed cycle 1. The added professions Level 1:' + salo); // �������� 1 ����. ���������� ����������� �������������� 1 ������: 
	}
	else
	{
		LogEvent('', 'Completed cycle 1. The added professions Level 1: 0 ');
	}
	//LogEvent('', '������ ������� (smallArray.length) ����� �������: ' + smallArray.length);
	//===============================================================================================================================
	
	for ( w = 1; w<=(rowLength-1); w++) // w - ����� ������� � EXCEL-�����(��������� ���������� � ����).=====================================
	{									 // �������� ��������� ��������� (����� �������) ������� ��������
		w1 = w + 1;
		LogEvent('', '������ ����  w = ' + w);
		for ( i = 0; i<=(rowLength-1); i++)  { cL[i]=''; aL[i]=0; }//�������� �������� ��������
		//LogEvent('', '������� ��������� �������� cL[i] � aL[i]');
		for ( row in srcDoc.TopElem[0] ) //���������� ��� ������ � �������� excel========================================================
		{
			//LogEvent('', '��������� ������ cL[0]..cL[' + (rowLength-1) + ']');
			rowCurrentNumber = 0;
			for ( i = 0; i<=(rowLength-1); i++) //��������� ������� ������
			{
				if ((row[i] != '')&&(cL[i]==''))  { cL[i]=row[i]; }
				if ((row[i] != '')&&(cL[i] !='')) { cL[i]=row[i]; }
				if  (row[i] != '') {rowCurrentNumber++;}
				//LogEvent('', 'cL[' + i + ']= '+ cL[i]);
			}
			if ((rowCurrentNumber>0)&&(cL[w] != '')&&(row[w] != '' )) //���� ������� ������ EXCEL-����� �� ������ � ��������������� ������� ������ �� ������
			{	
			//	LogEvent('', ' ������� ������ cL[0] = ' + cL[0] + ' cL[1] = ' + cL[1]);
				
				isInBase = false;
				isParentOpen = false;
				
				for ( profession in array ) //������� ������ ���������, ����������� �� ���� ������ E-Staff
				{		
					//LogEvent('', '����� ������� (w + 1) = ' + w1 );				
					//LogEvent('', '������ ������� aL[w], aL[w-1]...aL[0] �� ������� ��������� � �����������, �� �� ����, � ����� ���� ������ ������� w+1');
					for (x = w; x>=0; x = x - 1) 	//������ ������� aL[w], aL[w-1]...aL[0] �� ������� ��������� � �����������, �� �� ����, � ����� ���� ������ ������� w+1
					{						//�.�. ����� �� ������, ��� ����������� ����� ������ EXCEL-�����	
						if (x == w) {aL[x] = profession;}
						
						if (x < w)
						{
							if (aL[x+1] != 0)
							{
								if (aL[x+1].parent_id.HasValue == true)
								{
									//	LogEvent('', 'aL[x+1].id = ' + aL[x+1].id + ' aL[x+1].parent_id = ' + aL[x+1].parent_id);
									aL[x] = OpenDoc(ObjectDocUrl('data','profession', aL[x+1].parent_id)).TopElem;
								}
								else
								{
									aL[x] = 0;
								}
							}
							else
							{
								aL[x] = 0;
							}
						}
						//LogEvent('', 'aL[' + x + ']= ' + aL[x]); //  0,  1
					} //======��������� ������� �� ������� ��������� � �����������=================================
							
					//LogEvent('', '���������� ������� �� ������� ��������� � ����������� � ������� �������');
					coincidenceAll = 0;//=============================================================================
					coincidenceShort = 0;
					for (y = w; y>=0; y= (y - 1)) //���������� ������� �� ������� ��������� � ����������� � ������� ������� 
					{
					//	LogEvent('', 'aL[' + y + ']= ' + aL[y]);
							
						if (aL[y] != 0) 
						{ 
							//LogEvent('', 'y = ' + y + ' aL[y].name = ' + aL[y].name + ' cL[y] = ' + cL[y] );
							if (aL[y].name == cL[y]) {coincidenceAll++;} 
						}
							
						if ((aL[y] !=0) && (y>0))
						{
							if (aL[y].name == cL[y-1]) {coincidenceShort++;}
						}
					}
					//	LogEvent('', 'coincidenceAll = ' + coincidenceAll +  'coincidenceShort = ' + coincidenceShort);

						
					if (coincidenceAll == (w+1) ) //���� ������� ���
					{
					//	LogEvent('', '��������� - 1 - ������� ���');
						if (aL[0].parent_id.HasValue == false) //� ������ ����� ������� - ��� ������� ������� (��� ��������)
						{
							isInBase = true; //����� - ����� ����� ��������� ��� ���� � �������
						}
					}
						
					if (coincidenceShort == w ) //���� ������ ���, ����� ������ - ������ �������� (aL[0])
					{
					//	LogEvent('', ' ��������� - 2 - ������ ���, ����� ������ - ������ �������� (aL[0])');
						if (aL[1].parent_id.HasValue == false)
						{
							parent = aL[w];
							isParentOpen = true;
						}
					}//=======================================================================================================
				} // ������ ������ ��������� �� ���� ������ ==========================
					
				if ((isInBase == false)&&(isParentOpen == true)) //���������� ���������� ������� ��������� 
				{
					elemID = lib_voc.obtain_next_voc_elem_id( professions );
					subDoc = DefaultDb.OpenNewObjectDoc( 'profession', elemID );
					//	elemID = elemID + 1;
					subDoc.TopElem.order_index = lib_voc.obtain_next_voc_elem_order_index( professions );
					subDoc.TopElem.name =  row[w];
					subDoc.TopElem.parent_id = parent.id
					smallArray.push(subDoc.TopElem); //�������� ��������� � ��������� ������
					subDoc.Save();
				}		
			}	//�.�. ���� ������ ������ EXCEL-����� �� ������
		} //��������� ��� ������ � �������� EXCEL-����� =================
		
		for ( newProfession in smallArray )
		{ 
			LogEvent('', 'New profession ' + w1 + ' Level: ' + newProfession.name);
		}
		
		if ( smallArray.length > 0 )
		{
			array = ArrayUnion( array, smallArray ); //���������� �������
			salo = smallArray.length;
			smallArray.splice( 0, salo ); //������� ��������� ������
			LogEvent('', 'Completed ' + w1 + ' cycle. The added professions ' + w1 + 'Level: ' + salo);
		}
		else
		{
			LogEvent('', 'Completed ' + w1 + ' cycle. The added professions ' + w1 + 'Level: 0');
		}
	}//��������� ���� �� �������	
}
